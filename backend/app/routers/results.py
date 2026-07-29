from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import Job, Post, Comment, Topic, Persona, Product, PainPoint
from app.services.reddit import data_source_name
from app.routers.deps import get_owned_job

router = APIRouter(prefix="/api/research", tags=["results"])


@router.get("/{job_id}/overview")
def get_overview(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)):
    job_id = job.id
    stats = job.stats or {}
    return {
        "topic": job.topic,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "subreddits_found": job.subreddits_found or [],
        "post_count": stats.get("post_count", 0),
        "comment_count": stats.get("comment_count", 0),
        "user_count": stats.get("user_count", 0),
        "subreddit_count": stats.get("subreddit_count", 0),
        "sentiment_breakdown": stats.get("sentiment_breakdown", {"positive": 0, "negative": 0, "neutral": 0}),
        "subreddit_breakdown": stats.get("subreddit_breakdown", []),
        "activity_timeline": stats.get("activity_timeline", []),
        "keywords": stats.get("keywords", []),
        # Prefer the source recorded at scrape time; fall back to config-based guess
        "data_source": stats.get("data_source") or data_source_name(),
        "scrape_quality": stats.get("scrape_quality", {}),
        "requested_posts": stats.get("requested_posts", 0),
        "ai_summary": job.summary_context or "",
    }


@router.get("/{job_id}/topics")
def get_topics(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)):
    job_id = job.id
    topics = db.query(Topic).filter(Topic.job_id == job_id).order_by(Topic.size.desc()).all()
    result = []
    for t in topics:
        cluster_posts = (
            db.query(Post)
            .filter(Post.job_id == job_id, Post.topic_cluster == t.name)
            .all()
        )
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        for p in cluster_posts:
            label = p.sentiment or "neutral"
            if label in sentiment_counts:
                sentiment_counts[label] += 1

        top_posts = sorted(cluster_posts, key=lambda p: p.score or 0, reverse=True)[:4]

        result.append({
            "id": t.id,
            "name": t.name,
            "size": t.size,
            "sentiment": t.sentiment,
            "avg_sentiment_score": t.avg_sentiment_score,
            "keywords": t.keywords or [],
            "monthly_counts": t.monthly_counts or {},
            "sentiment_counts": sentiment_counts,
            "top_posts": [
                {
                    "title": p.title,
                    "score": p.score,
                    "subreddit": p.subreddit,
                    "url": p.url,
                    "sentiment": p.sentiment,
                }
                for p in top_posts
            ],
        })
    return result


@router.get("/{job_id}/personas")
def get_personas(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)):
    job_id = job.id
    personas = db.query(Persona).filter(Persona.job_id == job_id).all()
    pain_points = db.query(PainPoint).filter(PainPoint.job_id == job_id).order_by(PainPoint.frequency.desc()).all()
    return {
        "personas": [
            {
                "id": p.id,
                "name": p.name,
                "archetype": p.archetype,
                "demographics": p.demographics,
                "pain_points": p.pain_points or [],
                "goals": p.goals or [],
                "quotes": p.quotes or [],
                "subreddits": p.subreddits or [],
            }
            for p in personas
        ],
        "pain_points": [
            {
                "id": pp.id,
                "description": pp.description,
                "frequency": pp.frequency,
                "quotes": pp.quotes or [],
            }
            for pp in pain_points
        ],
    }


@router.get("/{job_id}/interests")
def get_interests(job: Job = Depends(get_owned_job)):
    stats = job.stats or {}
    return {
        "cross_interests": stats.get("cross_interests", []),
        "cross_interests_meta": stats.get("cross_interests_meta", {}),
        "audience_insights": stats.get("audience_insights", []),
        "subreddits_found": job.subreddits_found or [],
        "topic": job.topic,
    }


@router.get("/{job_id}/products")
def get_products(job: Job = Depends(get_owned_job), db: Session = Depends(get_db)):
    job_id = job.id
    products = db.query(Product).filter(Product.job_id == job_id).order_by(Product.mentions.desc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "mentions": p.mentions,
            "sentiment_score": p.sentiment_score,
            "sentiment_label": p.sentiment_label,
            "sample_quotes": p.sample_quotes or [],
        }
        for p in products
    ]


@router.get("/{job_id}/conversations")
def get_conversations(
    job: Job = Depends(get_owned_job),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    subreddit: str = Query(None),
    sentiment: str = Query(None),
    topic_cluster: str = Query(None),
    db: Session = Depends(get_db),
):
    job_id = job.id
    query = db.query(Post).filter(Post.job_id == job_id)

    if subreddit:
        query = query.filter(Post.subreddit == subreddit)
    if sentiment:
        query = query.filter(Post.sentiment == sentiment)
    if topic_cluster:
        query = query.filter(Post.topic_cluster == topic_cluster)

    total = query.count()
    posts = query.order_by(Post.score.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for p in posts:
        top_comments = (
            db.query(Comment)
            .filter(Comment.post_id == p.id)
            .order_by(Comment.score.desc())
            .limit(3)
            .all()
        )
        result.append({
            "id": p.id,
            "subreddit": p.subreddit,
            "title": p.title,
            "body": p.body[:500] if p.body else "",
            "score": p.score,
            "num_comments": p.num_comments,
            "author": p.author,
            "url": p.url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "sentiment": p.sentiment,
            "sentiment_score": p.sentiment_score,
            "topic_cluster": p.topic_cluster,
            "top_comments": [
                {"body": c.body[:300], "score": c.score, "author": c.author, "sentiment": c.sentiment}
                for c in top_comments
            ],
        })

    return {"total": total, "page": page, "page_size": page_size, "posts": result}
