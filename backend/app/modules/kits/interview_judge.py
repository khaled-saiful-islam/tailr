"""An AI honesty check for the plan's stories and pitch, after the deterministic checks.

Numbers can all be real and a claim still false: "I led a team of 4 to build the RAG
assistant" when the team of 4 worked on something else. The judge sees each story and each
pitch sentence with the facts it came from, and anything it flags is left out. If the judge
is unavailable, the deterministic checks still stand.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.ai.client import get_ai
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.kits import interview_prompts as prompts
from app.modules.kits.checks import FactSource
from app.modules.kits.interview_checks import split_sentences, spoken_seconds
from app.modules.kits.interview_schemas import InterviewPlan, Pitch
from app.modules.kits.schemas import JudgeVerdict

log = get_logger(__name__)


@dataclass(frozen=True)
class _Item:
    kind: str  # "story" or "pitch"
    index: int  # question index, or sentence index
    text: str
    sources: list[str]


def _items(plan: InterviewPlan, sources: dict[str, FactSource], about_me: str) -> list[_Item]:
    items = [
        _Item(
            "story",
            index,
            f"Question: {q.question}\nStory: "
            + " ".join([q.story.situation, q.story.task, q.story.action, q.story.result]),
            [sources[f].text for f in q.story.fact_ids if f in sources],
        )
        for index, q in enumerate(plan.questions)
        if q.story is not None
    ]
    pitch_sources = [sources[f].text for f in plan.pitch.fact_ids if f in sources]
    pitch_sources += [about_me] if about_me else []
    items += [
        _Item("pitch", index, sentence, pitch_sources)
        for index, sentence in enumerate(split_sentences(plan.pitch.text))
    ]
    return items


async def _verdict(blocks: list[str], user_id: uuid.UUID) -> JudgeVerdict | None:
    try:
        return await get_ai().structured(
            [
                {"role": "system", "content": prompts.JUDGE_SYSTEM},
                {"role": "user", "content": "\n\n".join(blocks)},
            ],
            JudgeVerdict,
            purpose="kits.interview_judge",
            user_id=user_id,
            temperature=0.0,
            max_tokens=1000,
        )
    except AppError as error:
        log.info("interview_judge_unavailable", error=error.message)
        return None


async def judge_answer(text: str, sources: list[str], user_id: uuid.UUID) -> str:
    """A tightened practice answer without the sentences its sources don't support."""
    sentences = split_sentences(text)
    if not sentences:
        return text
    listed = "\n".join(f"   source: {source}" for source in sources if source)
    verdict = await _verdict([f"{n}. {s}\n{listed}" for n, s in enumerate(sentences)], user_id)
    if verdict is None:
        return text
    flagged = {u.index for u in verdict.unsupported}
    return " ".join(s for n, s in enumerate(sentences) if n not in flagged)


async def judge_plan(
    plan: InterviewPlan,
    sources: dict[str, FactSource],
    about_me: str,
    user_id: uuid.UUID,
) -> InterviewPlan:
    """The plan without the stories and pitch sentences the judge finds unsupported."""
    items = _items(plan, sources, about_me)
    if not items:
        return plan
    blocks = [
        f"{n}. {item.text}\n" + "\n".join(f"   source: {s}" for s in item.sources)
        for n, item in enumerate(items)
    ]
    verdict = await _verdict(blocks, user_id)
    if verdict is None:
        return plan
    flagged = [items[u.index] for u in verdict.unsupported if 0 <= u.index < len(items)]
    stories = {item.index for item in flagged if item.kind == "story"}
    sentences = {item.index for item in flagged if item.kind == "pitch"}
    if not stories and not sentences:
        return plan
    text = " ".join(s for n, s in enumerate(split_sentences(plan.pitch.text)) if n not in sentences)
    return plan.model_copy(
        update={
            "questions": [
                q.model_copy(update={"story": None}) if n in stories else q
                for n, q in enumerate(plan.questions)
            ],
            "pitch": Pitch(text=text, fact_ids=plan.pitch.fact_ids, seconds=spoken_seconds(text)),
            "stories_removed": plan.stories_removed + len(stories),
        }
    )
