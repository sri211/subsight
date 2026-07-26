import anthropic
from app.config import settings

HAIKU = "claude-haiku-4-5-20251001"


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def chat(
    summary_context: str,
    message: str,
    history: list[dict],
) -> str:
    """
    Ask a question about a research job.
    summary_context: pre-built compact summary (~2k tokens)
    history: list of {"role": "user"|"assistant", "content": str}
    """
    system_prompt = f"""You are SubSight AI, an expert startup research analyst.
You have analyzed Reddit conversations and have the following intelligence report:

{summary_context}

Answer the user's questions based ONLY on this data. Be specific, cite numbers and quotes when relevant.
Keep answers concise (2-4 sentences) unless a detailed breakdown is requested.
If you don't have data to answer a question, say so clearly."""

    messages = []
    for h in history[-6:]:  # keep last 3 turns for context
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    try:
        resp = _client().messages.create(
            model=HAIKU,
            max_tokens=600,
            system=system_prompt,
            messages=messages,
        )
        return resp.content[0].text.strip()
    except Exception as e:
        return f"Sorry, I couldn't process that question: {str(e)}"
