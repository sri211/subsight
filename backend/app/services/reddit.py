"""
Reddit data fetching — four tiers:
  1. Apify (APIFY_TOKEN set)      → live Reddit data, today's posts, full content
  2. Reddit OAuth (creds set)     → live Reddit data via official API
  3. Reddit RSS (no creds)        → live Reddit data via public RSS feeds (titles only)
  4. Pullpush.io (no creds)       → community archive, ~1 year delay
"""
import requests
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import settings

# ── Apify ─────────────────────────────────────────────────────────────────────
APIFY_BASE = "https://api.apify.com/v2"
# Popular Reddit scraper actor on Apify — searches all of Reddit
# See: https://apify.com/trudax/reddit-scraper-lite
APIFY_ACTOR = "trudax~reddit-scraper-lite"

# ── Reddit OAuth ───────────────────────────────────────────────────────────────
REDDIT_OAUTH_BASE = "https://oauth.reddit.com"
_AGENT = f"SubSight/1.0 (personal; u/{settings.reddit_username or 'user'})"
_token_cache: dict = {"token": None, "expires_at": 0.0}

# ── Reddit RSS (public, no credentials) ───────────────────────────────────────
REDDIT_RSS_BASE = "https://www.reddit.com"
RSS_AGENT = "SubSight/1.0 personal-research (+https://github.com)"
RSS_NS = "{http://www.w3.org/2005/Atom}"

# ── Pullpush archive ───────────────────────────────────────────────────────────
PULLPUSH_BASE = "https://api.pullpush.io/reddit"
PULLPUSH_HEADERS = {"User-Agent": "SubSight/1.0 personal-research"}
DELAY = 0.4


# ── Source detection ──────────────────────────────────────────────────────────

def _use_apify() -> bool:
    return bool(settings.apify_token)

def _use_reddit_oauth() -> bool:
    return bool(settings.reddit_client_id and settings.reddit_client_secret)

# Records which tier actually delivered posts for the most recent scrape,
# so the UI reports the truth instead of guessing from configured credentials
_last_source: str = ""

SOURCE_LABELS = {
    "apify": "Live Reddit — Apify scraper (real-time)",
    "oauth": "Live Reddit — Official OAuth API (real-time)",
    "rss": "Live Reddit — RSS feed (real-time)",
    "archive": "Archive — Pullpush.io (~1 year delay)",
}

def data_source_name() -> str:
    if _last_source:
        return SOURCE_LABELS.get(_last_source, _last_source)
    if _use_apify():
        return SOURCE_LABELS["apify"]
    if _use_reddit_oauth():
        return SOURCE_LABELS["oauth"]
    return SOURCE_LABELS["rss"]


# ── Date parsing helper ───────────────────────────────────────────────────────

def _parse_dt(val) -> datetime | None:
    if isinstance(val, (int, float)) and val > 0:
        return datetime.utcfromtimestamp(val)
    if isinstance(val, str):
        for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ",
                    "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(val[:26].rstrip("Z"), fmt.rstrip("Z"))
            except Exception:
                pass
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 1 — Apify live scraping
# ═══════════════════════════════════════════════════════════════════════════════

def _apify_post(path: str, body: dict, timeout: int = 30) -> dict:
    resp = requests.post(
        f"{APIFY_BASE}/{path}",
        params={"token": settings.apify_token},
        json=body,
        timeout=timeout,
    )
    return resp.json() if resp.ok else {}


def _apify_get(path: str, params: dict | None = None, timeout: int = 20) -> dict | list:
    resp = requests.get(
        f"{APIFY_BASE}/{path}",
        params={"token": settings.apify_token, **(params or {})},
        timeout=timeout,
    )
    return resp.json() if resp.ok else {}


def _parse_apify_item(item: dict) -> tuple[dict | None, list[dict]]:
    """Flexible parser — handles different Apify actor output schemas."""
    post_id = (item.get("id") or item.get("postId") or
               (item.get("reddit_id") or "").replace("t3_", "") or "")
    if not post_id:
        return None, []

    body = item.get("text") or item.get("selftext") or item.get("body") or ""
    if body in ("[deleted]", "[removed]"):
        body = ""

    url = item.get("url") or item.get("link") or item.get("postUrl") or ""
    if url and not url.startswith("http"):
        url = f"https://reddit.com{url}"

    raw_sub = item.get("subreddit") or item.get("community") or item.get("communityName") or ""
    post = {
        "id": post_id,
        "subreddit": raw_sub.lstrip("r/").strip(),
        "title": item.get("title") or "",
        "body": str(body)[:2000],
        "score": item.get("score") or item.get("upvotes") or item.get("likesCount") or 0,
        "num_comments": (item.get("numberOfComments") or item.get("num_comments") or
                         item.get("commentsCount") or 0),
        "author": item.get("author") or item.get("username") or "[deleted]",
        "url": url,
        "created_at": _parse_dt(item.get("createdAt") or item.get("created_utc") or item.get("date")),
    }

    comments: list[dict] = []
    for c in item.get("comments", [])[:15]:
        cbody = c.get("body") or c.get("text") or c.get("content") or ""
        if not cbody or cbody in ("[deleted]", "[removed]") or len(str(cbody)) < 10:
            continue
        comments.append({
            "id": c.get("id") or f"c_{post_id}_{len(comments)}",
            "post_id": post_id,
            "body": str(cbody)[:600],
            "score": c.get("score") or c.get("upvotes") or 0,
            "author": c.get("author") or c.get("username") or "[deleted]",
        })

    return post, comments


def _apify_run_and_collect(
    actor_input: dict,
    max_items: int,
    progress_cb=None,
    start_pct: int = 12,
    end_pct: int = 35,
) -> tuple[list[dict], list[dict]]:
    """Start an Apify actor run, poll until done, return (posts, comments)."""

    # Start run
    if progress_cb:
        progress_cb("Starting live Reddit scrape (Apify)...", start_pct)

    run_data = _apify_post(f"acts/{APIFY_ACTOR}/runs", actor_input).get("data", {})
    run_id = run_data.get("id")
    dataset_id = run_data.get("defaultDatasetId")

    if not run_id:
        raise RuntimeError("Apify: failed to start run. Check APIFY_TOKEN in .env")

    # Poll for completion (max 12 minutes)
    for tick in range(144):
        time.sleep(5)
        pct = start_pct + int((end_pct - start_pct) * min(tick / 60, 0.95))
        if progress_cb and tick % 4 == 0:
            progress_cb(f"Scraping Reddit live... ({tick * 5}s)", pct)

        status_data = _apify_get(f"actor-runs/{run_id}")
        status = (status_data.get("data") or {}).get("status", "")

        if status == "SUCCEEDED":
            break
        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
            raise RuntimeError(f"Apify run {status}. Check actor logs at apify.com")
    else:
        raise RuntimeError("Apify run timed out after 12 minutes")

    # Fetch results
    items_data = _apify_get(
        f"datasets/{dataset_id}/items",
        params={"clean": "true", "limit": max_items},
        timeout=60,
    )
    raw_items = items_data if isinstance(items_data, list) else []

    posts: list[dict] = []
    comments: list[dict] = []
    seen_posts: set[str] = set()
    seen_comments: set[str] = set()

    for item in raw_items:
        post, item_comments = _parse_apify_item(item)
        if post and post["id"] not in seen_posts:
            seen_posts.add(post["id"])
            posts.append(post)
            for c in item_comments:
                if c["id"] not in seen_comments:
                    seen_comments.add(c["id"])
                    comments.append(c)

    # Also use post bodies as additional comment content
    for p in posts:
        bid = f"body_{p['id']}"
        if p["body"] and len(p["body"]) > 30 and bid not in seen_comments:
            seen_comments.add(bid)
            comments.append({"id": bid, "post_id": p["id"], "body": p["body"],
                              "score": p["score"], "author": p["author"]})

    return posts, comments


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 2 — Reddit OAuth (official API)
# ═══════════════════════════════════════════════════════════════════════════════

def _get_oauth_token() -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]
    resp = requests.post(
        "https://www.reddit.com/api/v1/access_token",
        auth=(settings.reddit_client_id, settings.reddit_client_secret),
        headers={"User-Agent": _AGENT},
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    d = resp.json()
    _token_cache["token"] = d["access_token"]
    _token_cache["expires_at"] = now + d.get("expires_in", 3600)
    return _token_cache["token"]


def _reddit_get(path: str, params: dict | None = None) -> dict:
    for _ in range(3):
        try:
            token = _get_oauth_token()
            r = requests.get(
                f"{REDDIT_OAUTH_BASE}{path}",
                headers={"Authorization": f"Bearer {token}", "User-Agent": _AGENT},
                params=params, timeout=15,
            )
            if r.status_code == 429:
                time.sleep(5)
                continue
            if r.ok:
                return r.json()
        except Exception:
            time.sleep(1)
    return {}


def _parse_reddit_listing(data: dict) -> list[dict]:
    posts = []
    for child in data.get("data", {}).get("children", []):
        item = child.get("data", {})
        if not item:
            continue
        body = item.get("selftext", "") or ""
        if body in ("[deleted]", "[removed]"):
            body = ""
        created = _parse_dt(item.get("created_utc"))
        posts.append({
            "id": item.get("id", ""),
            "subreddit": item.get("subreddit", ""),
            "title": item.get("title", ""),
            "body": body[:2000],
            "score": item.get("score", 0),
            "num_comments": item.get("num_comments", 0),
            "author": item.get("author", "[deleted]"),
            "url": f"https://reddit.com{item.get('permalink', '')}",
            "created_at": created,
        })
    return posts


# ═══════════════════════════════════════════════════════════════════════════════
# TIER 3 — Pullpush.io archive
# ═══════════════════════════════════════════════════════════════════════════════

def _pp_get(url: str, params: dict | None = None) -> dict:
    for _ in range(3):
        try:
            r = requests.get(url, headers=PULLPUSH_HEADERS, params=params, timeout=15)
            if r.status_code == 429:
                time.sleep(8)
                continue
            if r.ok:
                return r.json()
        except Exception:
            time.sleep(1)
    return {}


def _pp_parse(item: dict) -> dict | None:
    if not item or not item.get("id"):
        return None
    body = item.get("selftext", "") or ""
    if body in ("[deleted]", "[removed]"):
        body = ""
    return {
        "id": item["id"],
        "subreddit": item.get("subreddit", ""),
        "title": item.get("title", ""),
        "body": body[:2000],
        "score": item.get("score", 0),
        "num_comments": item.get("num_comments", 0),
        "author": item.get("author", "[deleted]"),
        "url": f"https://reddit.com{item.get('permalink', '')}",
        "created_at": _parse_dt(item.get("created_utc")),
    }


def _pp_paginate(params: dict, target: int) -> list[dict]:
    all_items: list[dict] = []
    seen: set[str] = set()
    current = {**params, "size": 100}
    for _ in range(10):
        if len(all_items) >= target:
            break
        data = _pp_get(f"{PULLPUSH_BASE}/search/submission/", current)
        items = data.get("data", [])
        if not items:
            break
        oldest: int | None = None
        added = 0
        for item in items:
            iid = item.get("id")
            if iid and iid not in seen:
                seen.add(iid)
                all_items.append(item)
                added += 1
            ts = item.get("created_utc")
            if ts and (oldest is None or ts < oldest):
                oldest = ts
        if added == 0 or oldest is None:
            break
        current = {**current, "before": oldest - 1}
        current.pop("sort_type", None)
        time.sleep(DELAY)
    return all_items[:target]


def _pp_fetch_comments(post_id: str) -> list[dict]:
    data = _pp_get(f"{PULLPUSH_BASE}/search/comment/", {
        "link_id": post_id, "size": 15, "sort": "desc", "sort_type": "score"
    })
    results = []
    for item in data.get("data", []):
        body = item.get("body", "") or ""
        if not body or body in ("[deleted]", "[removed]") or len(body) < 10:
            continue
        results.append({
            "id": item.get("id", f"c_{post_id}_{len(results)}"),
            "post_id": post_id,
            "body": body[:600],
            "score": item.get("score", 0),
            "author": item.get("author", "[deleted]"),
        })
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# Public interface
# ═══════════════════════════════════════════════════════════════════════════════

def discover_subreddits(topic: str, limit: int = 12) -> list[str]:
    """Find subreddits where the topic is genuinely discussed.

    Ranks by number of topic-relevant posts per subreddit, so a community that
    matched a single stray keyword doesn't hijack the whole analysis.
    """
    stems = _topic_stems(topic)
    sub_counts: dict[str, int] = {}

    def _tally(posts: list[dict]):
        kept, _ = _filter_relevant(stems, posts)
        for p in kept:
            sub = (p.get("subreddit") or "").lstrip("r/").strip()
            if sub:
                sub_counts[sub] = sub_counts.get(sub, 0) + 1

    try:
        if _use_apify():
            # Quick search run to discover subreddits
            try:
                run_data = _apify_post(f"acts/{APIFY_ACTOR}/runs", {
                    "searches": [topic], "maxItems": 50, "sort": "relevance", "type": "posts",
                    "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
                }).get("data", {})
                run_id = run_data.get("id")
                dataset_id = run_data.get("defaultDatasetId")
                if run_id:
                    for _ in range(60):
                        time.sleep(5)
                        status = (_apify_get(f"actor-runs/{run_id}").get("data") or {}).get("status", "")
                        if status == "SUCCEEDED":
                            break
                        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                            break
                    items = _apify_get(f"datasets/{dataset_id}/items", {"clean": "true", "limit": 50})
                    if isinstance(items, list):
                        _tally([
                            {
                                "subreddit": item.get("subreddit") or item.get("community") or item.get("communityName", ""),
                                "title": item.get("title", ""),
                                "body": item.get("body") or item.get("text", ""),
                            }
                            for item in items
                        ])
            except Exception:
                pass

        if _use_reddit_oauth() and not sub_counts:
            data = _reddit_get("/search", {"q": topic, "sort": "relevance", "t": "year", "limit": 100})
            _tally(_parse_reddit_listing(data))

        if not sub_counts:
            # RSS fallback for subreddit discovery
            content = _rss_get("/search.rss", {"q": topic, "sort": "relevance", "limit": 100})
            if content:
                _tally(_parse_rss(content))
            if not sub_counts:
                data = _pp_get(f"{PULLPUSH_BASE}/search/submission/", {
                    "q": topic, "size": 100, "sort": "desc", "sort_type": "score"
                })
                _tally([
                    {
                        "subreddit": (item.get("subreddit") or "").lstrip("r/").strip(),
                        "title": item.get("title", ""),
                        "body": item.get("selftext", ""),
                    }
                    for item in data.get("data", [])
                ])
    except Exception:
        pass

    ranked = sorted(sub_counts.items(), key=lambda x: x[1], reverse=True)
    # Prefer subreddits with 2+ relevant posts; pad with single-post ones if needed
    strong = [s for s, c in ranked if c >= 2]
    weak = [s for s, c in ranked if c == 1]
    return (strong + weak)[:limit]


# ── Topic relevance filtering ─────────────────────────────────────────────────
# Every scraped post must actually mention the topic. Without this, fallback
# feeds fill the dataset with random posts (e.g. "hydration drinks" returning
# barista job chatter from r/starbucks).

_GENERIC_TOKENS = {
    "best", "good", "new", "top", "review", "reviews", "the", "and", "for",
    "recommendation", "recommendations", "advice", "help", "question", "tips",
}

def _topic_stems(topic: str) -> list[str]:
    import re as _re
    stems = []
    for w in _re.findall(r"[a-zA-Z][a-zA-Z0-9]+", topic.lower()):
        if len(w) < 3 or w in _GENERIC_TOKENS:
            continue
        # crude stemming so "hydration" matches "hydrated", "drinks" matches "drink"
        for suf in ("ation", "ing", "ers", "ies", "er", "es", "s"):
            if w.endswith(suf) and len(w) - len(suf) >= 4:
                w = w[: len(w) - len(suf)]
                break
        stems.append(w)
    return stems or [topic.lower().strip()]

def _filter_relevant(stems: list[str], posts: list[dict]) -> tuple[list[dict], int]:
    """Keep posts whose title/body mentions at least one topic stem (word-prefix match)."""
    import re as _re
    patterns = [_re.compile(rf"\b{_re.escape(s)}") for s in stems]
    kept, dropped = [], 0
    for p in posts:
        text = f"{p.get('title', '')} {p.get('body', '')}".lower()
        if any(pat.search(text) for pat in patterns):
            kept.append(p)
        else:
            dropped += 1
    return kept, dropped


# Stats from the most recent scrape — pipeline persists these per job
last_scrape_stats: dict = {}


def scrape_posts_and_comments(
    topic: str,
    subreddits: list[str],
    max_posts: int = 500,
    progress_cb=None,
) -> tuple[list[dict], list[dict]]:
    global _last_source, last_scrape_stats

    stems = _topic_stems(topic)
    all_posts: list[dict] = []
    all_comments: list[dict] = []
    seen_pids: set[str] = set()
    seen_cids: set[str] = set()
    dropped_total = 0
    sources_used: list[str] = []

    def _absorb(posts: list[dict], comments: list[dict], source: str) -> int:
        nonlocal dropped_total
        kept, dropped = _filter_relevant(stems, posts)
        dropped_total += dropped
        added = 0
        for p in kept:
            if p["id"] not in seen_pids and len(all_posts) < max_posts:
                seen_pids.add(p["id"])
                all_posts.append(p)
                added += 1
        # Only keep comments whose parent post survived the relevance filter
        for c in comments:
            if c["id"] not in seen_cids and c.get("post_id") in seen_pids:
                seen_cids.add(c["id"])
                all_comments.append(c)
        if added:
            sources_used.append(source)
        return added

    if _use_apify():
        try:
            posts, comments = _scrape_apify(topic, subreddits, max_posts, progress_cb)
            _absorb(posts, comments, "apify")
        except Exception:
            pass

    if len(all_posts) < max_posts and _use_reddit_oauth():
        try:
            posts, comments = _scrape_oauth(topic, subreddits, max_posts - len(all_posts), progress_cb)
            _absorb(posts, comments, "oauth")
        except Exception:
            pass

    # RSS top-up whenever we're still well short of the target
    if len(all_posts) < max(50, max_posts // 2):
        try:
            posts, comments = _scrape_rss(topic, subreddits, max_posts - len(all_posts), progress_cb)
            _absorb(posts, comments, "rss")
        except Exception:
            pass

    # Last resort: archive
    if not all_posts:
        posts, comments = _scrape_archive(topic, subreddits, max_posts, progress_cb)
        _absorb(posts, comments, "archive")

    _last_source = sources_used[0] if sources_used else ""
    last_scrape_stats = {
        "kept": len(all_posts),
        "dropped_irrelevant": dropped_total,
        "requested": max_posts,
        "sources": sorted(set(sources_used)),
    }
    return all_posts, all_comments


def _scrape_apify(topic, subreddits, max_posts, progress_cb):
    """Live scrape via Apify — returns posts from today."""
    # Run search across all Reddit
    posts, comments = _apify_run_and_collect(
        actor_input={
            "searches": [topic],
            "maxItems": max_posts,
            "maxPostCount": max_posts,  # override default of 10
            "sort": "relevance",
            "type": "posts",
            "skipComments": False,
            "maxComments": 15,
            "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
        },
        max_items=max_posts,
        progress_cb=progress_cb,
        start_pct=12,
        end_pct=38,
    )

    # Broaden coverage with topic-restricted subreddit searches (NEVER unfiltered
    # /new/ feeds — those return random off-topic posts)
    if len(posts) < max_posts and subreddits:
        remaining = max_posts - len(posts)
        seen_ids = {p["id"] for p in posts}

        # Search the topic WITHIN each discovered subreddit using Reddit's
        # `subreddit:` search operator so every result stays on-topic
        sub_queries = [f"{topic} subreddit:{sub}" for sub in subreddits[:4]]
        try:
            if progress_cb:
                progress_cb("Searching topic within discovered communities...", 38)
            extra_posts, extra_comments = _apify_run_and_collect(
                actor_input={
                    "searches": sub_queries,
                    "maxItems": remaining,
                    "maxPostCount": remaining,
                    "sort": "relevance",
                    "type": "posts",
                    "skipComments": False,
                    "maxComments": 10,
                    "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
                },
                max_items=remaining,
                progress_cb=None,
                start_pct=38,
                end_pct=42,
            )
            for p in extra_posts:
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    posts.append(p)
            seen_cids = {c["id"] for c in comments}
            for c in extra_comments:
                if c["id"] not in seen_cids:
                    comments.append(c)
        except Exception:
            pass

    return posts[:max_posts], comments


def _scrape_oauth(topic, subreddits, max_posts, progress_cb):
    """Live scrape via Reddit OAuth API."""
    posts_data: list[dict] = []
    seen_ids: set[str] = set()
    half = max_posts // 2

    if progress_cb:
        progress_cb("Fetching live posts (Reddit OAuth)...", 12)
    for sort in ["new", "top", "hot"]:
        data = _reddit_get("/search", {"q": topic, "sort": sort, "t": "year", "limit": 100})
        for post in _parse_reddit_listing(data):
            if post["id"] not in seen_ids:
                seen_ids.add(post["id"])
                posts_data.append(post)
        time.sleep(0.5)
        if len(posts_data) >= half:
            break

    for i, sub in enumerate(subreddits[:6]):
        if len(posts_data) >= max_posts:
            break
        if progress_cb:
            progress_cb(f"Scraping r/{sub}...", 20 + i * 3)
        data = _reddit_get(f"/r/{sub}/search", {
            "q": topic, "sort": "new", "t": "year", "limit": 100, "restrict_sr": "true"
        })
        for post in _parse_reddit_listing(data):
            if post["id"] not in seen_ids:
                seen_ids.add(post["id"])
                posts_data.append(post)
        time.sleep(0.5)

    posts_data = posts_data[:max_posts]
    comments_data: list[dict] = []
    seen_cids: set[str] = set()

    for p in posts_data:
        bid = f"body_{p['id']}"
        if p["body"] and len(p["body"]) > 30:
            comments_data.append({"id": bid, "post_id": p["id"], "body": p["body"],
                                   "score": p["score"], "author": p["author"]})
            seen_cids.add(bid)

    # Live comments concurrent
    top_posts = sorted(posts_data, key=lambda x: x.get("score", 0), reverse=True)[:20]
    if progress_cb:
        progress_cb("Fetching comments (live, parallel)...", 36)

    def _oauth_comments(post_id: str) -> list[dict]:
        data = _reddit_get(f"/comments/{post_id}", {"limit": 15, "sort": "top", "depth": 1})
        results = []
        if isinstance(data, list) and len(data) >= 2:
            for child in data[1].get("data", {}).get("children", []):
                body = child.get("data", {}).get("body", "") or ""
                if not body or body in ("[deleted]", "[removed]") or len(body) < 10:
                    continue
                results.append({
                    "id": child["data"].get("id", f"c_{post_id}_{len(results)}"),
                    "post_id": post_id,
                    "body": body[:600],
                    "score": child["data"].get("score", 0),
                    "author": child["data"].get("author", "[deleted]"),
                })
        return results[:15]

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_oauth_comments, p["id"]): p["id"] for p in top_posts}
        for future in as_completed(futures):
            try:
                for c in future.result():
                    if c["id"] not in seen_cids:
                        seen_cids.add(c["id"])
                        comments_data.append(c)
            except Exception:
                pass

    return posts_data, comments_data


# Reddit rate-limits unauthenticated RSS hard (~1 request per few seconds per IP).
# Pace every request and back off on 429, otherwise the whole scrape collapses
# to a single page of results.
_rss_last_request = 0.0
_RSS_MIN_INTERVAL = 6.5  # seconds between RSS requests

def _rss_get(path: str, params: dict | None = None) -> bytes | None:
    global _rss_last_request
    for attempt in range(4):
        wait = _RSS_MIN_INTERVAL - (time.time() - _rss_last_request)
        if wait > 0:
            time.sleep(wait)
        try:
            _rss_last_request = time.time()
            r = requests.get(
                f"{REDDIT_RSS_BASE}{path}",
                params=params,
                headers={"User-Agent": RSS_AGENT},
                timeout=15,
            )
            if r.status_code == 429:
                time.sleep(15 * (attempt + 1))
                continue
            if r.ok and "xml" in r.headers.get("content-type", ""):
                return r.content
            return None
        except Exception:
            time.sleep(2)
    return None


_RSS_NOISE_RE = None

def _clean_rss_body(html: str) -> str:
    import re, html as html_module
    # Remove the Reddit footer: "submitted by /u/... [link] [comments]"
    html = re.sub(r"submitted by.*", "", html, flags=re.DOTALL)
    # Strip all HTML tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Decode HTML entities (&quot; &amp; &#32; etc.)
    text = html_module.unescape(text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1000]


def _parse_rss(content: bytes) -> list[dict]:
    import re
    posts = []
    try:
        root = ET.fromstring(content)
        for entry in root.findall(f"{RSS_NS}entry"):
            link_el = entry.find(f"{RSS_NS}link")
            url = link_el.attrib.get("href", "") if link_el is not None else ""
            title_el = entry.find(f"{RSS_NS}title")
            title = (title_el.text or "").strip() if title_el is not None else ""
            author_el = entry.find(f"{RSS_NS}author/{RSS_NS}name")
            author = (author_el.text or "[deleted]").strip() if author_el is not None else "[deleted]"
            updated_el = entry.find(f"{RSS_NS}updated")
            updated = (updated_el.text or "") if updated_el is not None else ""
            created = _parse_dt(updated)
            content_el = entry.find(f"{RSS_NS}content")
            body_html = (content_el.text or "") if content_el is not None else ""
            body_text = _clean_rss_body(body_html)
            # Extract subreddit from URL like /r/subreddit/comments/...
            sub_match = re.search(r"/r/([^/]+)/", url)
            subreddit = sub_match.group(1) if sub_match else ""
            # Extract post ID from URL
            id_match = re.search(r"/comments/([a-z0-9]+)/", url)
            post_id = id_match.group(1) if id_match else url[-10:]
            if title and post_id:
                posts.append({
                    "id": post_id,
                    "subreddit": subreddit,
                    "title": title,
                    "body": body_text,
                    "score": 1,
                    "num_comments": 0,
                    "author": author,
                    "url": url,
                    "created_at": created,
                })
    except Exception:
        pass
    return posts


def _rss_paginate(path: str, params: dict, target: int, seen_ids: set, max_pages: int = 2) -> list[dict]:
    """Fetch an RSS feed at limit=100, following `after` pagination a couple pages.

    Requests are expensive (Reddit throttles ~1 per 6s), so we maximise yield
    per request rather than walking many small pages.
    """
    results = []
    current_params = {**params, "limit": 100}
    after = None
    for _ in range(max_pages):
        if len(results) >= target:
            break
        if after:
            current_params["after"] = after
        content = _rss_get(path, current_params)
        if not content:
            break
        page_posts = _parse_rss(content)
        if not page_posts:
            break
        added = 0
        for p in page_posts:
            if p["id"] not in seen_ids:
                seen_ids.add(p["id"])
                results.append(p)
                added += 1
        if added == 0:
            break
        after = f"t3_{page_posts[-1]['id']}"
    return results


def _scrape_rss(topic, subreddits, max_posts, progress_cb):
    """Live scrape via Reddit RSS feeds — public, no credentials, returns today's posts."""
    posts_data: list[dict] = []
    seen_ids: set[str] = set()

    if progress_cb:
        progress_cb("Fetching live Reddit posts (RSS)...", 12)

    # Request plan ordered by expected yield. Each entry costs ~7-15s (Reddit
    # throttles unauthenticated feeds), so sort/time-filter diversity beats
    # deep pagination for pulling distinct result sets.
    plan: list[tuple[str, dict, str]] = [
        ("/search.rss", {"q": topic, "sort": "relevance"}, "most relevant"),
        ("/search.rss", {"q": topic, "sort": "top", "t": "all"}, "all-time top"),
        ("/search.rss", {"q": topic, "sort": "top", "t": "year"}, "top this year"),
        ("/search.rss", {"q": topic, "sort": "top", "t": "month"}, "top this month"),
        ("/search.rss", {"q": topic, "sort": "new"}, "newest"),
        ("/search.rss", {"q": topic, "sort": "comments"}, "most discussed"),
        ("/search.rss", {"q": f"{topic} recommendations", "sort": "relevance"}, "recommendations"),
        ("/search.rss", {"q": f"{topic} best", "sort": "relevance"}, "best-of threads"),
        ("/search.rss", {"q": f"{topic} problems", "sort": "relevance"}, "problem threads"),
        ("/search.rss", {"q": f"{topic} review", "sort": "relevance"}, "reviews"),
    ]
    # Topic search WITHIN discovered subreddits (restrict_sr keeps it on-topic
    # inside the community — never scrape a subreddit's raw /new feed)
    for sub in subreddits[:6]:
        plan.append((
            f"/r/{sub}/search.rss",
            {"q": topic, "sort": "relevance", "restrict_sr": "on"},
            f"inside r/{sub}",
        ))

    for i, (path, params, label) in enumerate(plan):
        if len(posts_data) >= max_posts:
            break
        if progress_cb:
            pct = min(12 + int(20 * len(posts_data) / max(max_posts, 1)) + i, 33)
            progress_cb(f"Live Reddit search: {label}... ({len(posts_data)} posts so far)", pct)
        batch = _rss_paginate(
            path,
            {**params, "include_over_18": "on"},
            min(max_posts - len(posts_data), 200),
            seen_ids,
        )
        posts_data.extend(batch)

    posts_data = posts_data[:max_posts]

    # Use titles+bodies as synthetic comments for NLP
    comments_data: list[dict] = []
    seen_cids: set[str] = set()
    for p in posts_data:
        text = ((p["title"] + " " + p["body"]) if p["body"] else p["title"])
        bid = f"body_{p['id']}"
        if bid not in seen_cids and len(text) > 10:
            seen_cids.add(bid)
            comments_data.append({
                "id": bid, "post_id": p["id"],
                "body": text[:600], "score": 1, "author": p["author"],
            })

    return posts_data, comments_data


def _scrape_archive(topic, subreddits, max_posts, progress_cb):
    """Pullpush.io archive fallback."""
    posts_data: list[dict] = []
    seen_ids: set[str] = set()
    half = max_posts // 2

    if progress_cb:
        progress_cb("Fetching posts (archive)...", 12)
    for item in _pp_paginate({"q": topic, "sort": "desc", "sort_type": "score"}, half):
        p = _pp_parse(item)
        if p and p["id"] not in seen_ids:
            seen_ids.add(p["id"])
            posts_data.append(p)

    if progress_cb:
        progress_cb("Fetching recent posts (archive)...", 20)
    for item in _pp_paginate({"q": topic, "sort": "desc", "sort_type": "created_utc"}, half):
        p = _pp_parse(item)
        if p and p["id"] not in seen_ids:
            seen_ids.add(p["id"])
            posts_data.append(p)

    for i, sub in enumerate(subreddits[:6]):
        if len(posts_data) >= max_posts:
            break
        if progress_cb:
            progress_cb(f"Scraping r/{sub}...", 25 + int(8 * i / 6))
        for item in _pp_paginate({"subreddit": sub, "sort": "desc", "sort_type": "score"}, 50):
            p = _pp_parse(item)
            if p and p["id"] not in seen_ids:
                seen_ids.add(p["id"])
                posts_data.append(p)

    posts_data = posts_data[:max_posts]
    comments_data: list[dict] = []
    seen_cids: set[str] = set()

    for p in posts_data:
        bid = f"body_{p['id']}"
        if p["body"] and len(p["body"]) > 30:
            comments_data.append({"id": bid, "post_id": p["id"], "body": p["body"],
                                   "score": p["score"], "author": p["author"]})
            seen_cids.add(bid)

    top_posts = sorted(posts_data, key=lambda x: x.get("score", 0), reverse=True)[:18]
    if progress_cb:
        progress_cb("Fetching comments (parallel)...", 34)

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_pp_fetch_comments, p["id"]): p["id"] for p in top_posts}
        for future in as_completed(futures):
            try:
                for c in future.result():
                    if c["id"] not in seen_cids:
                        seen_cids.add(c["id"])
                        comments_data.append(c)
            except Exception:
                pass

    return posts_data, comments_data


# NSFW / adult communities have no value for customer targeting and are
# jarring in a business dashboard — drop them at the source
# Unambiguous substrings — safe to match anywhere in the name
_NSFW_SUBSTRINGS = (
    "nsfw", "porn", "gonewild", "hentai", "rule34", "xxx", "onlyfans",
    "bdsm", "femdom", "futa", "creampie", "deepthroat", "fetish", "milf",
    "ahegao", "yiff", "erotic",
)
# Risky short words — only match as separate tokens (so "cum" doesn't flag
# r/Documentaries, "ass" doesn't flag r/classicalmusic)
_NSFW_TOKENS = {
    "sex", "cum", "cums", "boobs", "tits", "titties", "ass", "asses",
    "vagina", "vaginas", "pussy", "dick", "dicks", "cock", "cocks", "penis",
    "kink", "kinky", "nude", "nudes", "naked", "horny", "slut", "sluts",
    "whore", "whores", "escort", "escorts", "fap", "lewd", "thot", "smut",
    "bbw", "hookup", "hookups", "cumsluts", "meaty",
}

def _is_nsfw_sub(sub: str) -> bool:
    import re as _re
    # u_username "subreddits" are personal profile pages, not communities
    if sub.startswith("u_"):
        return True
    low = sub.lower()
    if any(s in low for s in _NSFW_SUBSTRINGS):
        return True
    # "cum..." prefix (cumfountain, cumslut) — spare "cumulative"-style words
    if low.startswith("cum") and not low.startswith("cumul"):
        return True
    # Tokenize on underscores/digits and camelCase boundaries
    spaced = _re.sub(r"(?<=[a-z])(?=[A-Z])", " ", sub)
    tokens = set(_re.split(r"[^a-zA-Z]+", spaced.lower()))
    if tokens & _NSFW_TOKENS:
        return True
    # Compound names like "gwcumsluts" that glue NSFW words together without
    # separators — longer words are safe to match as substrings
    return any(t in low for t in _NSFW_TOKENS if len(t) >= 5)


def get_user_cross_interests(
    authors: list[str],
    progress_cb=None,
) -> dict[str, dict[str, int]]:
    """Map users → their active subreddits (concurrent)."""
    unique = [a for a in set(authors) if a not in ("[deleted]", "AutoModerator", "")][:40]
    result: dict[str, dict[str, int]] = {}

    def _add(sub_counts: dict[str, int], sub: str, over_18) -> None:
        sub = (sub or "").lstrip("r/").strip()
        if not sub or over_18 or _is_nsfw_sub(sub):
            return
        sub_counts[sub] = sub_counts.get(sub, 0) + 1

    def _profile(username: str) -> tuple[str, dict[str, int]]:
        sub_counts: dict[str, int] = {}
        try:
            if _use_reddit_oauth():
                data = _reddit_get(f"/user/{username}/submitted",
                                   {"sort": "new", "limit": 50, "t": "year"})
                for post in _parse_reddit_listing(data):
                    _add(sub_counts, post.get("subreddit", ""), post.get("over_18", False))
                time.sleep(0.3)
            else:
                # Apify/RSS — use Pullpush archive for user history.
                # Both submissions AND comments: comments reveal participation
                # far better (most Redditors comment 10x more than they post).
                for endpoint in ("submission", "comment"):
                    data = _pp_get(f"{PULLPUSH_BASE}/search/{endpoint}/",
                                   {"author": username, "size": 50, "sort": "desc", "sort_type": "created_utc"})
                    for item in data.get("data", []):
                        _add(sub_counts, item.get("subreddit", ""), item.get("over_18", False))
                    time.sleep(DELAY)
        except Exception:
            pass
        return username, sub_counts

    if progress_cb:
        progress_cb(f"Profiling {len(unique)} users (parallel)...", 43)

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_profile, u): u for u in unique}
        done = 0
        for future in as_completed(futures):
            done += 1
            if progress_cb and done % 5 == 0:
                progress_cb(f"Profiling users ({done}/{len(unique)})...",
                            43 + int(7 * done / max(len(unique), 1)))
            try:
                username, sub_counts = future.result()
                if sub_counts:
                    result[username] = sub_counts
            except Exception:
                pass

    return result
