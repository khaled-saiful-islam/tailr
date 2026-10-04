"""'By the numbers': achievements worth leading with, each traced to one profile fact.

The AI picks and phrases them; code makes sure every number shown appears in the
fact it came from (the same rule the Apply Kit uses).
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from app.ai.client import get_ai
from app.modules.kits.checks import FactSource, fact_sources, numbers_in
from app.modules.profile.document import ProfileDocument
from app.modules.public_profile.schemas import Highlight

HIGHLIGHTS_SYSTEM = """You pick the most impressive, concrete achievements from a person's profile
for the top of their public profile page.

Rules:
- Choose up to 4 facts that contain a number (people, money, percentages, time, scale).
- For each, give `value`: the number as written in the fact, with its unit or symbol
  (for example "40,000", "38%", "RM 2M", "9h to 2h"), at most 24 characters.
- And `label`: a short phrase (at most 12 words) saying what the number is, in plain words,
  starting lowercase, without repeating the number. Example: "staff use the RAG assistant I built".
- Use only what the fact says. Never round, combine or invent numbers.
- Return the fact id you used for each.
"""


class _Suggestions(BaseModel):
    highlights: list[Highlight] = Field(default_factory=list)


def is_truthful(highlight: Highlight, sources: dict[str, FactSource]) -> bool:
    """Every number in the highlight must appear in the fact it cites."""
    source = sources.get(highlight.fact_id or "")
    if source is None:
        return False
    shown = numbers_in(f"{highlight.value} {highlight.label}")
    return bool(shown) and shown <= numbers_in(source.text)


def _facts_text(sources: dict[str, FactSource]) -> str:
    return "\n".join(f"FACT {s.id} ({s.owner}): {s.text}" for s in sources.values())


async def suggest_highlights(document: ProfileDocument, user_id: uuid.UUID) -> list[Highlight]:
    sources = fact_sources(document)
    if not any(numbers_in(s.text) for s in sources.values()):
        return []
    result = await get_ai().structured(
        [
            {"role": "system", "content": HIGHLIGHTS_SYSTEM},
            {"role": "user", "content": _facts_text(sources)},
        ],
        _Suggestions,
        purpose="public.highlights",
        user_id=user_id,
        temperature=0.2,
        max_tokens=600,
    )
    seen: set[str] = set()
    kept = []
    for highlight in result.highlights:
        if is_truthful(highlight, sources) and highlight.fact_id not in seen:
            kept.append(highlight)
            seen.add(highlight.fact_id or "")
    return kept[:4]
