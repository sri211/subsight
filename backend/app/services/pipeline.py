from datetime import datetime
from collections import Counter
from sqlalchemy.orm import Session

from app.models.schemas import Job, Post, Comment, UserProfile, Topic, Persona, Product, PainPoint
from app.services import reddit as reddit_svc
from app.services import nlp as nlp_svc
from app.services import claude as claude_svc


def _update_job(db: Session, job: Job, status: str, progress: int, stage: str):
    job.status = status
    job.progress = progress
    job.stage = stage
    db.commit()


def run_pipeline(job_id: str, topic: str, max_posts: int, db: Session):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return

    try:
        # ── Stage 1: Discover subreddits ──────────────────────────────────────
        _update_job(db, job, "running", 5, "Discovering relevant subreddits...")
        subreddits = reddit_svc.discover_subreddits(topic)
        job.subreddits_found = subreddits
        db.commit()

        # ── Stage 2: Scrape posts + comments ─────────────────────────────────
        def progress_cb(stage_text: str, pct: int):
            _update_job(db, job, "running", pct, stage_text)

        _update_job(db, job, "running", 12, f"Scraping posts from {len(subreddits)} subreddits...")
        posts_data, comments_data = reddit_svc.scrape_posts_and_comments(
            topic, subreddits, max_posts=max_posts, progress_cb=progress_cb
        )

        # Save posts
        for pd in posts_data:
            p = Post(
                id=pd["id"],
                job_id=job_id,
                subreddit=pd["subreddit"],
                title=pd["title"],
                body=pd["body"],
                score=pd["score"],
                num_comments=pd["num_comments"],
                author=pd["author"],
                url=pd["url"],
                created_at=pd["created_at"],
            )
            db.merge(p)

        # Save comments
        for cd in comments_data:
            c = Comment(
                id=cd["id"],
                post_id=cd["post_id"],
                job_id=job_id,
                body=cd["body"],
                score=cd["score"],
                author=cd["author"],
            )
            db.merge(c)
        db.commit()

        # ── Stage 3: User cross-interest profiling ────────────────────────────
        _update_job(db, job, "running", 35, "Building user interest profiles...")
        all_authors = [pd["author"] for pd in posts_data] + [cd["author"] for cd in comments_data]
        unique_authors = list({a for a in all_authors if a not in ("[deleted]", "AutoModerator")})

        user_profiles = reddit_svc.get_user_cross_interests(unique_authors, progress_cb)
        for username, sub_counts in user_profiles.items():
            up = UserProfile(job_id=job_id, username=username, cross_subreddits=sub_counts)
            db.add(up)
        db.commit()

        # ── Stage 4: NLP — sentiment + topics + keywords ─────────────────────
        _update_job(db, job, "running", 52, "Running NLP analysis...")

        all_texts = [f"{pd['title']} {pd['body']}" for pd in posts_data]
        all_comment_texts = [cd["body"] for cd in comments_data]

        # Sentiment on posts
        for pd in posts_data:
            text = f"{pd['title']} {pd['body']}"
            label, score = nlp_svc.analyze_sentiment(text)
            db.query(Post).filter(Post.id == pd["id"]).update(
                {"sentiment": label, "sentiment_score": score}
            )

        # Sentiment on comments
        for cd in comments_data:
            label, score = nlp_svc.analyze_sentiment(cd["body"])
            db.query(Comment).filter(Comment.id == cd["id"]).update(
                {"sentiment": label, "sentiment_score": score}
            )

        # Topic clustering
        if len(all_texts) >= 5:
            _update_job(db, job, "running", 56, "Clustering conversation themes...")
            labels = nlp_svc.cluster_topics(all_texts)
            cluster_terms = nlp_svc.get_cluster_top_terms(all_texts, labels, topic=topic)

            # Claude names the clusters — TF-IDF names collapse into
            # near-duplicates because every cluster shares the topic's words
            cluster_titles: dict[int, list[str]] = {}
            for i, pd in enumerate(posts_data):
                cid = labels[i] if i < len(labels) else 0
                titles = cluster_titles.setdefault(cid, [])
                if len(titles) < 6:
                    titles.append(pd["title"])
            claude_names = claude_svc.name_topic_clusters(topic, [
                {"id": cid, "keywords": cluster_terms.get(cid, []), "sample_titles": cluster_titles.get(cid, [])}
                for cid in sorted(set(labels))
            ])

            def _cluster_name(cid: int) -> str:
                return claude_names.get(cid) or nlp_svc.generate_topic_name(cluster_terms.get(cid, []))

            # Assign topic_cluster to posts
            for i, pd in enumerate(posts_data):
                cluster_id = labels[i] if i < len(labels) else 0
                db.query(Post).filter(Post.id == pd["id"]).update(
                    {"topic_cluster": _cluster_name(cluster_id), "keywords": cluster_terms.get(cluster_id, [])}
                )

            # Build topic records
            db.query(Topic).filter(Topic.job_id == job_id).delete()
            cluster_sentiments: dict[int, list[float]] = {}
            cluster_dates: dict[int, list] = {}
            for i, pd in enumerate(posts_data):
                cid = labels[i] if i < len(labels) else 0
                cluster_sentiments.setdefault(cid, [])
                label_s, score_s = nlp_svc.analyze_sentiment(f"{pd['title']} {pd['body']}")
                cluster_sentiments[cid].append(score_s)
                if pd.get("created_at"):
                    cluster_dates.setdefault(cid, []).append(pd["created_at"])

            cluster_counts = Counter(labels)
            for cid, count in cluster_counts.items():
                terms = cluster_terms.get(cid, [])
                scores = cluster_sentiments.get(cid, [0.0])
                avg_s = sum(scores) / len(scores) if scores else 0.0
                monthly: dict[str, int] = {}
                for dt in cluster_dates.get(cid, []):
                    if isinstance(dt, datetime):
                        key = dt.strftime("%b %Y")
                        monthly[key] = monthly.get(key, 0) + 1
                t = Topic(
                    job_id=job_id,
                    name=_cluster_name(cid),
                    size=count,
                    sentiment=nlp_svc.sentiment_label(avg_s),
                    avg_sentiment_score=round(avg_s, 4),
                    keywords=terms,
                    monthly_counts=monthly,
                )
                db.add(t)
            db.commit()

        # Keywords + word cloud
        keywords = nlp_svc.extract_keywords(all_texts + all_comment_texts)

        # Claude-based product detection (topic-aware, filters irrelevant mentions)
        _update_job(db, job, "running", 62, "Identifying products & brands (AI)...")
        high_score_posts_for_products = sorted(posts_data, key=lambda x: x.get("score", 0), reverse=True)[:50]
        claude_products = claude_svc.detect_products(topic, high_score_posts_for_products)

        db.query(Product).filter(Product.job_id == job_id).delete()
        for cp in claude_products[:20]:
            name = cp.get("name", "").strip()
            if not name:
                continue
            cat = cp.get("category", "")
            why = cp.get("why_mentioned", "")
            # Encode category+why as sample_quotes[0] so frontend can parse it
            # Format: "[Category] Why mentioned text"
            meta = f"[{cat}] {why}" if cat else why
            pr = Product(
                job_id=job_id,
                name=name,
                mentions=int(cp.get("mentions", 1)),
                sentiment_score=0.0,
                sentiment_label=cp.get("sentiment", "MIXED"),
                sample_quotes=[meta] + list(cp.get("sample_quotes", []))[:2],
            )
            db.add(pr)
        db.commit()

        # Cross interests — user-history profiling needs a meaningful sample
        # (percentages from 2 users are noise); otherwise fall back to
        # community distribution which is honest about what it measures
        profiled_count = len([u for u, subs in user_profiles.items() if subs])
        cross_interests = nlp_svc.aggregate_cross_interests(user_profiles, subreddits)
        if cross_interests and profiled_count >= 5:
            cross_interests_meta = {"method": "user_history", "sample_size": profiled_count}
        else:
            sub_counts: dict[str, int] = {}
            for pd in posts_data:
                sub = pd.get("subreddit", "")
                if sub:
                    sub_counts[sub] = sub_counts.get(sub, 0) + 1
            total_posts = max(len(posts_data), 1)
            cross_interests = [
                {"subreddit": sub, "user_count": count, "percentage": round(count / total_posts * 100, 1)}
                for sub, count in sorted(sub_counts.items(), key=lambda x: x[1], reverse=True)[:30]
                if count >= 1
            ]
            cross_interests_meta = {"method": "community_distribution", "sample_size": len(posts_data)}
        activity_timeline = nlp_svc.build_activity_timeline(posts_data)

        # ── Stage 5: Claude analysis (Sonnet, batched) ────────────────────────
        _update_job(db, job, "running", 70, "Generating AI personas and insights...")

        high_score_posts = sorted(posts_data, key=lambda x: x.get("score", 0), reverse=True)[:40]
        personas_raw = claude_svc.generate_personas(topic, high_score_posts)
        pain_points_raw = claude_svc.generate_pain_points(topic, high_score_posts)

        # Save personas
        db.query(Persona).filter(Persona.job_id == job_id).delete()
        for pr in personas_raw:
            p = Persona(
                job_id=job_id,
                name=pr.get("name", "Unknown"),
                archetype=pr.get("archetype", ""),
                demographics=pr.get("demographics", ""),
                pain_points=pr.get("pain_points", []),
                goals=pr.get("goals", []),
                quotes=pr.get("quotes", []),
                subreddits=pr.get("subreddits", []),
            )
            db.add(p)

        # Audience targeting playbook (needs both cross-interests and personas)
        _update_job(db, job, "running", 82, "Building audience targeting playbook...")
        audience_insights = claude_svc.generate_audience_insights(
            topic, cross_interests, personas_raw, cross_interests_meta.get("method", "")
        )

        # Save pain points
        db.query(PainPoint).filter(PainPoint.job_id == job_id).delete()
        for pp in pain_points_raw:
            p = PainPoint(
                job_id=job_id,
                description=pp.get("description", ""),
                frequency=pp.get("frequency", 1),
                quotes=pp.get("quotes", []),
            )
            db.add(p)
        db.commit()

        # ── Stage 6: Build chat summary snapshot ──────────────────────────────
        _update_job(db, job, "running", 90, "Building AI assistant context...")

        topics_for_summary = [
            {"name": t.name, "size": t.size, "keywords": t.keywords}
            for t in db.query(Topic).filter(Topic.job_id == job_id).all()
        ]
        products_for_summary = [
            {"name": pr.name, "mentions": pr.mentions, "sentiment_label": pr.sentiment_label}
            for pr in db.query(Product).filter(Product.job_id == job_id).all()
        ]
        sample_quotes = [
            cd["body"][:150]
            for cd in sorted(comments_data, key=lambda x: x.get("score", 0), reverse=True)[:10]
        ]
        summary = claude_svc.build_summary_snapshot(
            topic=topic,
            topics=topics_for_summary,
            personas=personas_raw,
            pain_points=pain_points_raw,
            products=products_for_summary,
            cross_interests=cross_interests,
            quotes=sample_quotes,
        )

        # ── Stage 7: Final stats ──────────────────────────────────────────────
        unique_user_count = len(set(pd["author"] for pd in posts_data if pd["author"] != "[deleted]"))
        subreddit_set = set(pd["subreddit"] for pd in posts_data)

        job.summary_context = summary
        job.stats = {
            "post_count": len(posts_data),
            "comment_count": len(comments_data),
            "user_count": unique_user_count,
            "subreddit_count": len(subreddit_set),
            "keywords": keywords,
            "activity_timeline": activity_timeline,
            "cross_interests": cross_interests,
            "cross_interests_meta": cross_interests_meta,
            "audience_insights": audience_insights,
            "data_source": reddit_svc.data_source_name(),
            "scrape_quality": dict(reddit_svc.last_scrape_stats),
            "requested_posts": max_posts,
            "sentiment_breakdown": {
                "positive": sum(1 for pd in posts_data if pd.get("sentiment") == "positive") or _count_sentiment(db, job_id, "positive"),
                "negative": sum(1 for pd in posts_data if pd.get("sentiment") == "negative") or _count_sentiment(db, job_id, "negative"),
                "neutral": sum(1 for pd in posts_data if pd.get("sentiment") == "neutral") or _count_sentiment(db, job_id, "neutral"),
            },
            "subreddit_breakdown": [
                {"subreddit": sub, "count": sum(1 for pd in posts_data if pd["subreddit"] == sub)}
                for sub in sorted(subreddit_set, key=lambda s: sum(1 for pd in posts_data if pd["subreddit"] == s), reverse=True)
            ][:10],
        }
        job.status = "complete"
        job.progress = 100
        job.stage = "Complete"
        db.commit()

    except Exception as e:
        import traceback
        job.status = "failed"
        job.error = traceback.format_exc()
        job.stage = f"Failed: {str(e)}"
        db.commit()


def _count_sentiment(db: Session, job_id: str, label: str) -> int:
    return db.query(Post).filter(Post.job_id == job_id, Post.sentiment == label).count()
