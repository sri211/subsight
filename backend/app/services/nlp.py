import re
from collections import Counter
from datetime import datetime
from typing import Optional

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()

_nlp = None
_spacy_available = None


def _get_nlp():
    global _nlp, _spacy_available
    if _spacy_available is None:
        try:
            import spacy
            try:
                _nlp = spacy.load("en_core_web_sm")
            except OSError:
                _nlp = spacy.blank("en")
            _spacy_available = True
        except ImportError:
            _spacy_available = False
    return _nlp


def sentiment_label(score: float) -> str:
    if score >= 0.05:
        return "positive"
    if score <= -0.05:
        return "negative"
    return "neutral"


def analyze_sentiment(text: str) -> tuple[str, float]:
    if not text or not text.strip():
        return "neutral", 0.0
    scores = _vader.polarity_scores(text[:4000])
    compound = scores["compound"]
    return sentiment_label(compound), round(compound, 4)


def extract_entities(texts: list[str]) -> dict[str, int]:
    """Returns {entity_text: count} for PRODUCT/ORG entities across all texts."""
    nlp = _get_nlp()
    entity_counts: dict[str, int] = {}

    if nlp is not None:
        for text in texts:
            if not text:
                continue
            doc = nlp(text[:1000])
            for ent in doc.ents:
                if ent.label_ in ("PRODUCT", "ORG", "NORP") and len(ent.text) > 2:
                    name = ent.text.strip()
                    entity_counts[name] = entity_counts.get(name, 0) + 1
    else:
        # Fallback: extract capitalized multi-word phrases (likely brand/product names)
        import re
        for text in texts:
            if not text:
                continue
            matches = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', text)
            for m in matches:
                if len(m) > 3:
                    entity_counts[m] = entity_counts.get(m, 0) + 1

    return entity_counts


def _clean_text(text: str) -> str:
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


STOP_WORDS = {
    "the", "a", "an", "is", "it", "in", "on", "at", "to", "for", "of", "and",
    "or", "but", "not", "with", "that", "this", "i", "me", "my", "we", "you",
    "he", "she", "they", "be", "been", "being", "have", "has", "had", "do",
    "does", "did", "will", "would", "could", "should", "may", "might", "shall",
    "can", "am", "are", "was", "were", "get", "got", "just", "like", "so",
    "really", "very", "also", "now", "then", "than", "more", "much", "many",
    "some", "any", "all", "no", "one", "two", "use", "using", "used", "make",
    "made", "good", "great", "know", "think", "feel", "want", "need", "try",
    "tried", "time", "day", "people", "thing", "way", "even", "still",
    "reddit", "post", "comment", "edit", "update", "deleted", "removed",
    # Contraction fragments (from tokenizing "don't"→"don t", "I've"→"i ve")
    "ve", "don", "didn", "doesn", "isn", "aren", "wasn", "weren", "won",
    "ll", "re", "couldn", "wouldn", "shouldn", "haven", "hadn", "mustn",
    "s", "t", "m", "d", "n", "y", "nt",
    # Pronouns and determiners
    "their", "them", "those", "these", "our", "its", "your", "his", "her",
    "itself", "myself", "yourself", "himself", "herself", "themselves",
    # Common fillers that add no meaning
    "lot", "bit", "kind", "sort", "stuff", "things", "something", "anything",
    "going", "back", "well", "around", "about", "when", "while",
    "where", "what", "which", "who", "how", "why", "here", "there",
    "never", "always", "every", "each", "other", "another", "same",
    "because", "since", "though", "although", "however", "therefore",
    "actually", "basically", "literally", "probably", "maybe", "probably",
    "said", "says", "saying", "going", "come", "came", "let", "right",
    "sure", "yeah", "yes", "okay", "ok", "hi", "hey", "thanks", "thank",
    "new", "old", "big", "little", "long", "high", "low", "first", "last",
    # RSS feed boilerplate noise
    "link", "comments", "submitted", "quot", "nbsp", "amp", "lt", "gt",
    "http", "https", "www", "com", "reddit",
    # Reddit voting/UI noise
    "downvoted", "upvoted", "downvote", "upvote", "voted", "vote",
    "karma", "points", "gilded", "awarded", "crossposted",
    # Conversational chatter that carries no topical signal
    "hello", "guys", "guy", "yall", "gonna", "wanna", "gotta", "dont",
    "tomorrow", "yesterday", "today", "tonight", "morning", "night",
    "week", "weeks", "month", "months", "year", "years", "ago", "days",
    "look", "looking", "looks", "looked", "advice", "tips", "tip",
    "question", "questions", "help", "anyone", "anybody", "everyone",
    "else", "definitely", "completely", "totally", "different",
    "recommend", "recommendation", "recommendations", "suggestions",
    "please", "pls", "thx", "lol", "lmao", "omg", "tbh", "imo", "imho",
    "worked", "working", "works", "getting", "gets", "started", "start",
    "trying", "wondering", "curious", "interested", "favorite", "best",
}


def extract_keywords(texts: list[str], top_n: int = 30) -> list[dict]:
    """Extract top keywords using TF-IDF-like term frequency across documents."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np

    cleaned = [_clean_text(t) for t in texts if t and len(t) > 20]
    if len(cleaned) < 3:
        # Fallback: simple frequency count
        all_words = " ".join(cleaned).split()
        counts = Counter(w for w in all_words if w not in STOP_WORDS and len(w) > 3)
        total = sum(counts.values()) or 1
        return [{"text": w, "value": round(c / total * 100, 2)} for w, c in counts.most_common(top_n)]

    try:
        tfidf = TfidfVectorizer(
            max_features=300,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            token_pattern=r"(?u)\b[a-zA-Z]{3,}\b",  # min 3 chars, letters only
        )
        X = tfidf.fit_transform(cleaned)
        scores = np.asarray(X.mean(axis=0)).ravel()
        feature_names = tfidf.get_feature_names_out()
        top_indices = scores.argsort()[-top_n * 2:][::-1]
        max_score = scores[top_indices[0]] if len(top_indices) > 0 else 1.0
        results = []
        for i in top_indices:
            name = feature_names[i]
            if name not in STOP_WORDS and len(name) >= 3 and not any(w in STOP_WORDS for w in name.split()):
                results.append({"text": name, "value": round(float(scores[i]) / float(max_score) * 100, 2)})
            if len(results) >= top_n:
                break
        return results
    except Exception:
        all_words = " ".join(cleaned).split()
        counts = Counter(w for w in all_words if w not in STOP_WORDS and len(w) > 3)
        total = sum(counts.values()) or 1
        return [{"text": w, "value": round(c / total * 100, 2)} for w, c in counts.most_common(top_n)]


def cluster_topics(texts: list[str], n_clusters: int = 8) -> list[int]:
    """Assigns each text a topic cluster id (0-indexed)."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans

    cleaned = [_clean_text(t) for t in texts]
    n_clusters = min(n_clusters, max(2, len(cleaned) // 5))

    try:
        tfidf = TfidfVectorizer(max_features=500, stop_words="english", min_df=1)
        X = tfidf.fit_transform(cleaned)
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = km.fit_predict(X)
        return labels.tolist()
    except Exception:
        return [i % n_clusters for i in range(len(texts))]


def get_cluster_top_terms(texts: list[str], labels: list[int], topic: str = "") -> dict[int, list[str]]:
    """Returns top terms per cluster.

    Terms made purely of the research topic's own words are excluded — every
    cluster obviously contains "protein powder" in a protein powder search, so
    those words can't distinguish one cluster from another.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    import numpy as np
    import re

    topic_stems = set()
    for w in re.findall(r"[a-zA-Z]+", topic.lower()):
        if len(w) >= 3:
            topic_stems.add(w[:5] if len(w) > 5 else w)

    def _is_topic_only(term: str) -> bool:
        words = term.split()
        return bool(words) and all(
            any(w.startswith(stem) or stem.startswith(w[:4]) for stem in topic_stems)
            for w in words
        )

    n_clusters = max(labels) + 1 if labels else 1
    cluster_terms: dict[int, list[str]] = {}

    for cluster_id in range(n_clusters):
        cluster_texts = [texts[i] for i, l in enumerate(labels) if l == cluster_id]
        if not cluster_texts:
            cluster_terms[cluster_id] = []
            continue
        cleaned = [_clean_text(t) for t in cluster_texts]
        try:
            tfidf = TfidfVectorizer(max_features=100, stop_words="english", ngram_range=(1, 2), min_df=1)
            X = tfidf.fit_transform(cleaned)
            scores = np.asarray(X.mean(axis=0)).ravel()
            feature_names = tfidf.get_feature_names_out()
            top_indices = scores.argsort()[-16:][::-1]
            terms = [
                feature_names[i] for i in top_indices
                if feature_names[i] not in STOP_WORDS
                and not (topic_stems and _is_topic_only(feature_names[i]))
            ]
            cluster_terms[cluster_id] = terms[:6]
        except Exception:
            cluster_terms[cluster_id] = []

    return cluster_terms


def generate_topic_name(terms: list[str]) -> str:
    """Creates a readable topic name from top terms."""
    if not terms:
        return "General Discussion"
    # Capitalize top 2 terms and join
    words = [t.title() for t in terms[:2] if t]
    return " & ".join(words) if len(words) > 1 else words[0]


def build_activity_timeline(posts: list[dict]) -> list[dict]:
    """Returns [{month: 'Jan 2024', count: 12}, ...]."""
    monthly: dict[str, int] = {}
    for post in posts:
        dt = post.get("created_at")
        if isinstance(dt, datetime):
            key = dt.strftime("%b %Y")
            monthly[key] = monthly.get(key, 0) + 1
    # Sort chronologically (approximate by year-month string)
    def sort_key(k):
        try:
            return datetime.strptime(k, "%b %Y")
        except Exception:
            return datetime.min

    return [{"month": k, "count": v} for k, v in sorted(monthly.items(), key=lambda x: sort_key(x[0]))]


# Mega-viral catch-all subreddits that nearly every Redditor touches — they
# say nothing about who an audience is, so they'd crowd out real signal
LOW_SIGNAL_SUBS = {
    "askreddit", "funny", "pics", "memes", "dankmemes", "me_irl", "meirl",
    "mildlyinfuriating", "mildlyinteresting", "interestingasfuck",
    "damnthatsinteresting", "unpopularopinion", "showerthoughts",
    "todayilearned", "amitheasshole", "aitah", "nostupidquestions",
    "facepalm", "therewasanattempt", "whatcouldgowrong", "publicfreakout",
    "clevercomebacks", "murderedbywords", "rareinsults", "adviceanimals",
    "wholesomememes", "shitposting", "okbuddyretard", "teenagers",
    "casualconversation", "self", "rant", "vent", "polls", "answers",
}


def aggregate_cross_interests(user_profiles: dict[str, dict[str, int]], topic_subreddits: list[str]) -> list[dict]:
    """Returns [{subreddit, user_count, percentage}] excluding topic subreddits.

    Only communities shared by 2+ users make the cut — a subreddit one single
    user posts in is personal noise, not an audience pattern.
    """
    topic_subs_lower = {s.lower() for s in topic_subreddits}
    global_counts: dict[str, int] = {}
    total_users = len(user_profiles)

    for username, sub_counts in user_profiles.items():
        for sub, count in sub_counts.items():
            low = sub.lower()
            if low in topic_subs_lower or low in LOW_SIGNAL_SUBS:
                continue
            global_counts[sub] = global_counts.get(sub, 0) + 1

    if not global_counts or total_users == 0:
        return []

    shared = {s: c for s, c in global_counts.items() if c >= 2}
    if len(shared) < 3:
        # Not enough overlap to say anything meaningful
        return []

    sorted_interests = sorted(shared.items(), key=lambda x: x[1], reverse=True)
    return [
        {
            "subreddit": sub,
            "user_count": count,
            "percentage": round(count / total_users * 100, 1),
        }
        for sub, count in sorted_interests[:25]
    ]
