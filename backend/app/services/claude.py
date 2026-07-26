import json
import anthropic
from app.config import settings

SONNET = "claude-sonnet-4-6"


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _format_posts_sample(posts: list[dict], max_posts: int = 30) -> str:
    sample = posts[:max_posts]
    lines = []
    for p in sample:
        text = (p.get("title") or "") + "\n" + (p.get("body") or "")[:300]
        lines.append(f"[r/{p.get('subreddit', '?')}] {text.strip()}")
    return "\n\n---\n\n".join(lines)


def generate_personas(topic: str, posts: list[dict]) -> list[dict]:
    sample = _format_posts_sample(posts, 30)
    prompt = f"""You are analyzing Reddit conversations about "{topic}".
Based on these posts, identify 3-5 distinct customer personas who might be potential customers for a startup in this space.

For each persona return a JSON object with EXACTLY these fields:
- name: string (creative archetype, e.g. "The Biohacker")
- archetype: string (one sentence description)
- demographics: string (e.g. "Ages 25-35, predominantly male")
- pain_points: array of 3-5 strings
- goals: array of 2-3 strings
- quotes: array of 2 verbatim quotes from the posts above
- subreddits: array of subreddit names where this persona is found

Return ONLY a JSON array. No markdown, no explanation.

Posts:
{sample}"""

    try:
        msg = _client().messages.create(
            model=SONNET,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        return [{"name": "Analysis Pending", "archetype": str(e), "demographics": "", "pain_points": [], "goals": [], "quotes": [], "subreddits": []}]


def generate_pain_points(topic: str, posts: list[dict]) -> list[dict]:
    sample = _format_posts_sample(posts, 30)
    prompt = f"""Analyze these Reddit conversations about "{topic}".
Extract the top 10 most common pain points, frustrations, or unmet needs.

For each return a JSON object with:
- description: string (clear one-sentence pain point)
- frequency: integer 1-10 (how common, 10 = very frequent)
- quotes: array of 1-2 verbatim quotes that illustrate this pain point

Return ONLY a JSON array sorted by frequency descending. No markdown, no explanation.

Posts:
{sample}"""

    try:
        msg = _client().messages.create(
            model=SONNET,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception:
        return []


def detect_products(topic: str, posts: list[dict]) -> list[dict]:
    """Use Claude to identify products/brands relevant to the topic from posts."""
    sample = _format_posts_sample(posts, 40)
    prompt = f"""You are analyzing Reddit conversations about "{topic}".

Extract products, brands, specific items, or solutions that Redditors are actively discussing IN THE CONTEXT of "{topic}".

INCLUDE: drinks, supplements, bottles, devices, apps, brands, ingredients people recommend or critique for "{topic}"
EXCLUDE:
- Products mentioned purely incidentally with no connection to {topic}
- Generic websites (Reddit, YouTube, Discord, Google)
- People's names or movie/show characters
- Subreddit names
- Vague items like "stuff", "things"

For each relevant product, return exactly:
{{
  "name": "Product/Brand name",
  "category": "what type of product (e.g. Electrolyte drink, Water bottle, Supplement)",
  "mentions": <integer count of times referenced>,
  "sentiment": "LOVED" | "MIXED" | "CRITICIZED",
  "why_mentioned": "one sentence: why do people mention this in hydration discussions",
  "sample_quotes": ["verbatim quote 1", "verbatim quote 2"]
}}

Return ONLY a valid JSON array ([] if no relevant products found). No markdown fences.

Reddit posts about "{topic}":
{sample}"""

    try:
        msg = _client().messages.create(
            model=SONNET,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip("`").strip()
        result = json.loads(raw)
        return result if isinstance(result, list) else []
    except Exception:
        return []


def name_topic_clusters(topic: str, clusters: list[dict]) -> dict[int, str]:
    """Generate distinct, human-readable names for topic clusters.

    TF-IDF names collapse into near-duplicates ("Protein & Powder" ×5) because
    every cluster shares the search topic's words. Claude sees sample titles
    and names what actually distinguishes each cluster.
    """
    if not clusters:
        return {}
    blocks = []
    for c in clusters:
        titles = "\n".join(f"  - {t[:110]}" for t in c.get("sample_titles", [])[:6])
        kws = ", ".join(c.get("keywords", [])[:6])
        blocks.append(f"Cluster {c['id']} (keywords: {kws}):\n{titles}")
    clusters_text = "\n\n".join(blocks)

    prompt = f"""These are clusters of Reddit posts about "{topic}". Name each cluster.

Rules:
- 2-5 words per name, plain language a founder instantly understands
- Each name MUST be clearly distinct from the others — capture what makes THAT cluster different
- Describe the conversation theme (e.g. "Brand comparisons & reviews", "Beginner dosage questions", "Side effects & safety concerns"), never just repeat "{topic}"
- No quotes, no numbering in the name

{clusters_text}

Return ONLY a JSON object mapping cluster id to name, e.g. {{"0": "Brand comparisons", "1": "Safety concerns"}}. No markdown fences."""

    try:
        msg = _client().messages.create(
            model=SONNET,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip("`").strip())
        return {int(k): str(v).strip() for k, v in parsed.items() if str(v).strip()}
    except Exception:
        return {}


def generate_audience_insights(
    topic: str,
    cross_interests: list[dict],
    personas: list[dict],
    method: str,
) -> list[dict]:
    """Turn raw cross-interest data into actionable customer-targeting advice."""
    interests_text = "\n".join(
        f"- r/{ci.get('subreddit')}: {ci.get('percentage', 0)}%"
        for ci in cross_interests[:20]
    )
    personas_text = "\n".join(
        f"- {p.get('name', '')}: {p.get('archetype', '')} | pains: {'; '.join(p.get('pain_points', [])[:2])}"
        for p in personas[:4]
    )
    basis = (
        "the other subreddits these users are active in (their real interests)"
        if method == "user_history"
        else "the communities where this topic is discussed"
    )
    prompt = f"""You are a growth marketing strategist. A startup founder researched "{topic}" on Reddit.

Audience data — {basis}:
{interests_text}

Customer personas found:
{personas_text}

Give 4-5 concrete, actionable recommendations for reaching and converting this audience.
Each must reference the actual data above (specific communities or personas).
Think: where to advertise, which communities to engage authentically, messaging angles,
partnership/influencer opportunities, positioning against what this audience already loves.

Return ONLY a JSON array of objects with EXACTLY these fields:
- title: string (short punchy name, e.g. "Partner with fitness micro-influencers")
- insight: string (1-2 sentences: what the data shows and why it matters)
- action: string (1 sentence: the specific next step to take)

No markdown fences, no explanation."""

    try:
        msg = _client().messages.create(
            model=SONNET,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip("`").strip())
        return result if isinstance(result, list) else []
    except Exception:
        return []


def build_summary_snapshot(
    topic: str,
    topics: list[dict],
    personas: list[dict],
    pain_points: list[dict],
    products: list[dict],
    cross_interests: list[dict],
    quotes: list[str],
) -> str:
    """Builds a compact text summary (~2k tokens) used as system context for the chat agent."""
    lines = [f"# Reddit Intelligence Report: {topic}\n"]

    lines.append("## Topic Clusters")
    for t in topics[:5]:
        keywords = ", ".join(t.get("keywords", [])[:4])
        lines.append(f"- {t['name']} ({t['size']} posts) — keywords: {keywords}")

    lines.append("\n## Customer Personas")
    for p in personas[:4]:
        pps = "; ".join(p.get("pain_points", [])[:3])
        lines.append(f"- **{p.get('name')}** ({p.get('demographics', '')}): {pps}")

    lines.append("\n## Top Pain Points")
    for pp in pain_points[:10]:
        lines.append(f"- [{pp.get('frequency', '?')}/10] {pp.get('description', '')}")

    lines.append("\n## Products Mentioned")
    for pr in products[:10]:
        lines.append(f"- {pr.get('name')}: {pr.get('mentions')} mentions, {pr.get('sentiment_label', 'mixed')}")

    lines.append("\n## Cross-Category Interests (other subreddits these users follow)")
    for ci in cross_interests[:10]:
        lines.append(f"- r/{ci.get('subreddit')}: {ci.get('percentage', 0)}% of users")

    lines.append("\n## Representative Quotes")
    for q in quotes[:8]:
        lines.append(f'> "{q}"')

    return "\n".join(lines)
