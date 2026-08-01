"""
Zero-cost, fully local Customer DNA generator.

Personas and pain points are extracted directly from scraped posts/comments
using TF-IDF clustering, VADER sentiment, and a curated archetype taxonomy —
no LLM calls, no external API, no per-run cost. Every field is either
computed statistically (frequency, demographics) or lifted verbatim from
real Reddit text (descriptions, quotes, goals) rather than synthesized.
"""
import re
from collections import Counter

import numpy as np

from app.services.nlp import _clean_text, STOP_WORDS, analyze_sentiment, topic_stem_set, is_topic_only_term

MIN_KEYWORD_LEN = 4  # skips leftover fragments like "out" after stopword stripping

MIN_SENTENCE_LEN = 25  # chars — filters out fragments like "yeah" or "lol"
MAX_SENTENCE_LEN = 280  # chars — an un-punctuated run-on isn't a clean "sentence"
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def _ensure_terminal_punct(text: str) -> str:
    """Guarantees text ends with .!? before it gets joined with other pieces.

    Without this, joining two unrelated posts/comments with a bare space can
    let a phrase-extraction regex span across the boundary and produce a
    run-on that mixes content from two different posts.
    """
    text = (text or "").strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text


def _split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []
    return [
        p.strip() for p in _SENTENCE_SPLIT_RE.split(text)
        if MIN_SENTENCE_LEN <= len(p.strip()) <= MAX_SENTENCE_LEN
    ]


def _tidy_sentence(s: str) -> str:
    s = s.strip()
    if not s:
        return s
    s = s[0].upper() + s[1:]
    if s[-1] not in ".!?":
        s += "."
    return s


# ── Pain points ────────────────────────────────────────────────────────────────

def _collect_negative_sentences(posts_data: list[dict], comments_data: list[dict]) -> list[str]:
    sentences = []
    for pd in posts_data:
        text = f"{pd.get('title', '')}. {pd.get('body', '')}"
        for s in _split_sentences(text):
            label, _ = analyze_sentiment(s)
            if label == "negative":
                sentences.append(s)
    for cd in comments_data:
        for s in _split_sentences(cd.get("body", "")):
            label, _ = analyze_sentiment(s)
            if label == "negative":
                sentences.append(s)
    return sentences


def generate_pain_points_local(posts_data: list[dict], comments_data: list[dict], top_n: int = 10) -> list[dict]:
    """Clusters negative-sentiment sentences; the sentence closest to each
    cluster's centroid becomes the (verbatim, not synthesized) description."""
    sentences = _collect_negative_sentences(posts_data, comments_data)
    if len(sentences) < 5:
        return []

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans
    from sklearn.metrics.pairwise import cosine_similarity

    cleaned = [_clean_text(s) for s in sentences]
    try:
        vectorizer = TfidfVectorizer(max_features=800, stop_words=list(STOP_WORDS), ngram_range=(1, 2), min_df=1)
        X = vectorizer.fit_transform(cleaned)
    except ValueError:
        return []
    if X.shape[1] == 0:
        return []

    n_clusters = min(top_n, max(2, len(sentences) // 8))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = km.fit_predict(X)

    cluster_sizes = Counter(labels)
    max_size = max(cluster_sizes.values())
    results = []

    for cid in sorted(set(labels)):
        idxs = [i for i, l in enumerate(labels) if l == cid]
        if not idxs:
            continue
        centroid = km.cluster_centers_[cid].reshape(1, -1)
        sims = cosine_similarity(X[idxs], centroid).ravel()
        order = np.argsort(-sims)
        ranked = [sentences[idxs[i]] for i in order]

        description = _tidy_sentence(ranked[0])
        quotes = [_tidy_sentence(q) for q in ranked[1:3]]
        frequency = max(1, round(len(idxs) / max_size * 10))

        results.append({
            "description": description,
            "frequency": frequency,
            "quotes": quotes,
            "_size": len(idxs),
        })

    results.sort(key=lambda r: r["_size"], reverse=True)
    for r in results:
        r.pop("_size", None)
    return results[:top_n]


# ── Personas ───────────────────────────────────────────────────────────────────

# (name, archetype description, trigger keywords) — the highest-overlap rule
# wins; falls back to a keyword-derived template when nothing matches well
ARCHETYPE_RULES = [
    ("The Evidence-Seeker", "Wants data, studies, and expert validation before trusting a product or claim",
     {"study", "studies", "research", "evidence", "science", "scientific", "doctor", "clinical", "proof", "peer"}),
    ("The Budget-Conscious Buyer", "Price-sensitive, compares cost carefully before spending",
     {"price", "cost", "cheap", "cheaper", "expensive", "budget", "afford", "affordable", "value", "money", "worth"}),
    ("The Newcomer", "Just getting started, looking for foundational guidance and reassurance",
     {"beginner", "start", "starting", "new", "first", "confused", "overwhelmed"}),
    ("The Comparison Shopper", "Actively weighing multiple options before committing to one",
     {"vs", "versus", "compare", "comparison", "better", "alternative", "recommend", "recommendation", "which"}),
    ("The Cautious Skeptic", "Wary of risks or side effects, seeks safety reassurance before acting",
     {"safe", "safety", "risk", "risky", "danger", "dangerous", "worried", "concern", "concerned", "side", "effect", "harmful"}),
    ("The Parent", "Making decisions on behalf of their family, not just themselves",
     {"kid", "kids", "child", "children", "son", "daughter", "mom", "dad", "mother", "father", "family", "parent"}),
    ("The Performance Optimizer", "Fitness- or results-focused, tracks progress closely and pushes for gains",
     {"workout", "gym", "training", "athlete", "performance", "muscle", "strength", "reps", "sets", "gains"}),
    ("The DIY Enthusiast", "Prefers building or making their own solution rather than buying premade",
     {"diy", "homemade", "recipe", "myself", "build", "mix"}),
    ("The Frustrated Critic", "Had a negative experience and is vocal about what went wrong",
     {"hate", "worst", "waste", "disappointed", "terrible", "awful", "refund", "scam", "broke", "broken"}),
    ("The Advocate", "Enthusiastic and satisfied, actively recommends the product or approach to others",
     {"love", "amazing", "best", "highly", "favorite", "changed", "great"}),
    ("The Habitual User", "Has folded this into a daily or long-term routine",
     {"daily", "routine", "everyday", "habit", "years", "months", "consistently", "regularly"}),
]


def _score_archetype(keywords: list[str]) -> tuple[str, str]:
    kw_set = {k.lower() for k in keywords}
    best_name, best_desc, best_score = None, None, 0
    for name, desc, triggers in ARCHETYPE_RULES:
        score = len(kw_set & triggers)
        if score > best_score:
            best_name, best_desc, best_score = name, desc, score
    if best_score == 0:
        top = keywords[0].title() if keywords else "Community"
        return f"The {top} Enthusiast", f"Frequently discusses {', '.join(keywords[:3]) or 'this topic'}"
    return best_name, best_desc


_AGE_RE = re.compile(r"\bi'?m\s+(\d{2})\b|\b(\d{2})\s*(?:yo|y/o|years?[\s-]?old)\b|\baged?\s+(\d{2})\b", re.I)
_FEMALE_HINTS = re.compile(r"\bas a (?:woman|wife|mom|mother|girl)\b|\bmy husband\b|\bshe/her\b", re.I)
_MALE_HINTS = re.compile(r"\bas a (?:man|husband|dad|father|guy)\b|\bmy wife\b|\bhe/him\b", re.I)


def _extract_demographics(texts: list[str]) -> str:
    ages = []
    female_hits = male_hits = 0
    for t in texts:
        for m in _AGE_RE.finditer(t):
            for g in m.groups():
                if g and 13 <= int(g) <= 90:
                    ages.append(int(g))
        female_hits += len(_FEMALE_HINTS.findall(t))
        male_hits += len(_MALE_HINTS.findall(t))

    parts = []
    if len(ages) >= 3:
        ages.sort()
        trim = max(0, len(ages) // 10)
        lo, hi = ages[trim], ages[-(trim + 1)]
        lo, hi = min(lo, hi), max(lo, hi)
        parts.append(f"Around age {lo}" if lo == hi else f"Ages {lo}-{hi}")
    if female_hits + male_hits >= 3:
        if female_hits > male_hits * 1.5:
            parts.append("skews female")
        elif male_hits > female_hits * 1.5:
            parts.append("skews male")
        else:
            parts.append("mixed gender")
    return ", ".join(parts) if parts else "Not enough signal in posts to infer demographics"


# Two trigger families, phrased differently in the output: "want/trying/hoping
# to X" reads naturally as "To X", but "looking for X" needs "Find X" instead
# — prefixing it with "To" produces nonsense ("To a cheaper alternative").
_GOAL_RE_TO = re.compile(
    r"\bi(?:'m| am)?\s+(?:want|wanted|need|needed|hop(?:e|ing)|tr(?:y|ying|ied))\s+to\s+([a-z][^.!?]{5,60})"
    r"|\bwant(?:ing)? to\s+([a-z][^.!?]{5,60})"
    r"|\btrying to\s+([a-z][^.!?]{5,60})",
    re.I,
)
_GOAL_RE_FIND = re.compile(r"\blooking for\s+([a-z][^.!?]{5,60})", re.I)


def _extract_goals(texts: list[str], limit: int = 3) -> list[str]:
    phrases = []
    for t in texts:
        for m in _GOAL_RE_TO.finditer(t):
            phrase = next(g for g in m.groups() if g).strip().rstrip(",")
            if 8 <= len(phrase) <= 70:
                phrases.append(("To", phrase[0].lower() + phrase[1:]))
        for m in _GOAL_RE_FIND.finditer(t):
            phrase = m.group(1).strip().rstrip(",")
            if 8 <= len(phrase) <= 70:
                phrases.append(("Find", phrase[0].lower() + phrase[1:]))
    if not phrases:
        return []
    counts = Counter(phrases)
    seen_prefixes: set[str] = set()
    result = []
    for (verb, phrase), _ in counts.most_common(limit * 4):
        prefix = " ".join(phrase.split()[:4])
        if prefix in seen_prefixes:
            continue
        seen_prefixes.add(prefix)
        result.append(phrase if phrase.lower().startswith("to ") else f"{verb} {phrase}")
        if len(result) >= limit:
            break
    return result


def generate_personas_local(
    posts_data: list[dict], comments_data: list[dict], topic: str = "", max_personas: int = 5
) -> list[dict]:
    """Clusters AUTHORS (not individual posts) by their combined text, so
    each segment represents a real recurring type of person, not just a
    conversation topic."""
    topic_stems = topic_stem_set(topic)
    author_texts: dict[str, list[str]] = {}
    author_subs: dict[str, Counter] = {}
    author_posts: dict[str, list[dict]] = {}

    for pd in posts_data:
        author = pd.get("author")
        if not author or author in ("[deleted]", "AutoModerator"):
            continue
        text = f"{pd.get('title', '')} {pd.get('body', '')}".strip()
        if text:
            author_texts.setdefault(author, []).append(_ensure_terminal_punct(text))
        if pd.get("subreddit"):
            author_subs.setdefault(author, Counter())[pd["subreddit"]] += 1
        author_posts.setdefault(author, []).append(pd)

    for cd in comments_data:
        author = cd.get("author")
        if not author or author in ("[deleted]", "AutoModerator"):
            continue
        body = cd.get("body", "").strip()
        if body:
            author_texts.setdefault(author, []).append(_ensure_terminal_punct(body))

    authors = [a for a, texts in author_texts.items() if sum(len(t) for t in texts) >= 60]
    if len(authors) < 6:
        return []

    combined = [" ".join(author_texts[a]) for a in authors]

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans

    cleaned = [_clean_text(t) for t in combined]
    try:
        vectorizer = TfidfVectorizer(max_features=600, stop_words=list(STOP_WORDS), ngram_range=(1, 1), min_df=2)
        X = vectorizer.fit_transform(cleaned)
    except ValueError:
        return []
    if X.shape[1] == 0:
        return []

    n_clusters = min(max_personas, max(2, len(authors) // 12))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = km.fit_predict(X)
    feature_names = vectorizer.get_feature_names_out()

    personas = []
    for cid in sorted(set(labels)):
        idxs = [i for i, l in enumerate(labels) if l == cid]
        if len(idxs) < 2:
            continue
        cluster_authors = [authors[i] for i in idxs]

        # Pull more candidates than needed, then drop topic-restating and
        # too-short leftover terms before taking the top ones — otherwise
        # every persona's top keyword is just the topic itself
        mean_scores = np.asarray(X[idxs].mean(axis=0)).ravel()
        candidate_idx = mean_scores.argsort()[-40:][::-1]
        keywords = [
            feature_names[i] for i in candidate_idx
            if mean_scores[i] > 0
            and len(feature_names[i]) >= MIN_KEYWORD_LEN
            and not (topic_stems and is_topic_only_term(feature_names[i], topic_stems))
        ][:10]

        name, archetype = _score_archetype(keywords)

        cluster_texts = [combined[i] for i in idxs]
        demographics = _extract_demographics(cluster_texts)
        goals = _extract_goals(cluster_texts)

        cluster_posts = [p for a in cluster_authors for p in author_posts.get(a, [])]
        cluster_pain_points = generate_pain_points_local(cluster_posts, [], top_n=5)
        pain_point_descriptions = [pp["description"] for pp in cluster_pain_points] or \
            ["No strongly negative-sentiment posts found for this segment"]

        top_posts = sorted(cluster_posts, key=lambda p: p.get("score", 0), reverse=True)[:2]
        quotes = [p["title"][:200] for p in top_posts if p.get("title")]

        sub_counter: Counter = Counter()
        for a in cluster_authors:
            sub_counter.update(author_subs.get(a, {}))
        subreddits = [s for s, _ in sub_counter.most_common(5)]

        personas.append({
            "name": name,
            "archetype": archetype,
            "demographics": demographics,
            "pain_points": pain_point_descriptions,
            "goals": goals,
            "quotes": quotes,
            "subreddits": subreddits,
            "_size": len(idxs),
        })

    personas.sort(key=lambda p: p["_size"], reverse=True)
    for p in personas:
        p.pop("_size", None)
    return personas[:max_personas]
