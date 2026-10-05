"""Truth checks for interview prep, applied before anyone sees the AI's work.

- A story must cite facts that exist, and every number in it must be in those facts;
  otherwise the story is left out (an empty story beats an invented one).
- The pitch, checklist and tightened answers lose any sentence with a number the
  candidate's own words don't contain.
- Unfinished [placeholders] and citation tags never reach the page.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable
from datetime import datetime

from app.modules.kits.checks import FactSource, _numbers, strip_citations
from app.modules.kits.interview_schemas import (
    AnswerScores,
    AskThem,
    FeedbackDraft,
    InterviewPlan,
    Pitch,
    PitchDraft,
    PlanQuestion,
    QuestionDraft,
    SkillQuestionsDraft,
    StarStory,
    StoryPlanDraft,
)
from app.modules.kits.schemas import Language

KIND_ORDER = ("role", "experience", "gap", "situational", "motivation")
KIND_LIMIT = {"role": 5, "experience": 4, "gap": 3, "situational": 3, "motivation": 2}
WORDS_PER_SECOND = 2.5  # about 150 words a minute, a calm speaking pace

_PLACEHOLDER = re.compile(r"\[[^\]]{1,40}\]")
_SENTENCE = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"\w+", re.UNICODE)


def question_id(text: str) -> str:
    """A short id that stays the same when the same question is written again."""
    normal = " ".join(_WORD.findall(text.casefold()))
    return hashlib.sha1(normal.encode()).hexdigest()[:10]  # noqa: S324 - an id, not security


def word_count(text: str) -> int:
    return len(_WORD.findall(text))


def spoken_seconds(text: str) -> int:
    return round(word_count(text) / WORDS_PER_SECOND)


def numbers_of(texts: Iterable[str]) -> set[str]:
    found: set[str] = set()
    for text in texts:
        found |= _numbers(text)
    return found


def _clean(text: str, limit: int = 600) -> str:
    return strip_citations(text).strip()[:limit]


def split_sentences(text: str) -> list[str]:
    return [sentence for sentence in _SENTENCE.split(text.strip()) if sentence]


def keep_supported_sentences(text: str, allowed: set[str], *, keep_prompts: bool = False) -> str:
    """Drop sentences with a number the allowed sources don't contain. Sentences with an
    unfinished [placeholder] are dropped too, unless `keep_prompts`: then a bracket is a
    prompt for the candidate to fill in (its numbers don't count)."""
    kept = []
    for sentence in split_sentences(_clean(text, 2000)):
        claims = _PLACEHOLDER.sub("", sentence)
        if (keep_prompts or claims == sentence) and _numbers(claims) <= allowed:
            kept.append(sentence)
    return " ".join(kept).strip()


def check_story(story: StarStory | None, sources: dict[str, FactSource]) -> StarStory | None:
    """The story if it cites real facts and claims no number they don't contain."""
    if story is None:
        return None
    cited = [f for f in dict.fromkeys(story.fact_ids) if f in sources]
    if not cited:
        return None
    # Citation tags ("[fact 86801513106b]") go first, so they aren't taken for placeholders.
    text = " ".join(
        strip_citations(part) for part in (story.situation, story.task, story.action, story.result)
    )
    if _PLACEHOLDER.search(text):
        return None
    if not _numbers(text) <= numbers_of(sources[f].text for f in cited):
        return None
    return StarStory(
        situation=_clean(story.situation, 400),
        task=_clean(story.task, 400),
        action=_clean(story.action, 500),
        result=_clean(story.result, 400),
        fact_ids=cited,
    )


def _question(draft: QuestionDraft, sources: dict[str, FactSource]) -> tuple[PlanQuestion, bool]:
    story = check_story(draft.story, sources)
    question = _clean(draft.question, 300)
    return (
        PlanQuestion(
            id=question_id(question),
            kind=draft.kind,
            question=question,
            why_they_ask=_clean(draft.why_they_ask, 400),
            strong_answer=[_clean(p, 300) for p in draft.strong_answer if p.strip()][:4],
            story=story,
            follow_ups=[_clean(q, 300) for q in draft.follow_ups if q.strip()][:2],
            pitfall=_clean(draft.pitfall, 300),
            skill=_clean(draft.skill, 60) if draft.skill else None,
        ),
        draft.story is not None and story is None,
    )


def _questions(
    drafts: list[QuestionDraft], sources: dict[str, FactSource]
) -> tuple[list[PlanQuestion], int]:
    by_kind: dict[str, list[PlanQuestion]] = {kind: [] for kind in KIND_ORDER}
    seen: set[str] = set()
    removed = 0
    for draft in drafts:
        if not draft.question.strip():
            continue
        question, lost_story = _question(draft, sources)
        bucket = by_kind[question.kind]
        if question.id in seen or len(bucket) >= KIND_LIMIT[question.kind]:
            continue
        seen.add(question.id)
        removed += int(lost_story)
        bucket.append(question)
    return [q for kind in KIND_ORDER for q in by_kind[kind]], removed


def assemble_plan(
    *,
    skills: SkillQuestionsDraft,
    story: StoryPlanDraft,
    sources: dict[str, FactSource],
    own_words: Iterable[str],
    job_text: str,
    gaps: list[str],
    language: Language,
    now: datetime,
) -> InterviewPlan:
    """Join the two halves of the plan and hold every part to the candidate's own facts."""
    questions, removed = _questions(skills.questions + story.questions, sources)
    own_numbers = numbers_of(own_words)
    pitch = _pitch(story.pitch, sources, own_numbers)
    checklist_numbers = own_numbers | _numbers(job_text)
    checked = (keep_supported_sentences(entry, checklist_numbers) for entry in story.checklist)
    checklist = [item for item in checked if item][:7]
    return InterviewPlan(
        language=language,
        built_at=now,
        pitch=pitch,
        questions=questions,
        ask_them=[
            AskThem(question=_clean(item.question, 300), why=_clean(item.why, 300))
            for item in story.ask_them
            if item.question.strip()
        ][:5],
        checklist=checklist,
        gaps=gaps,
        stories_removed=removed,
    )


def _pitch(draft: PitchDraft, sources: dict[str, FactSource], allowed: set[str]) -> Pitch:
    text = keep_supported_sentences(draft.text, allowed)
    return Pitch(
        text=text,
        fact_ids=[f for f in dict.fromkeys(draft.fact_ids) if f in sources],
        seconds=spoken_seconds(text),
    )


def _score(value: int) -> int:
    return max(1, min(5, int(value)))


def check_feedback(draft: FeedbackDraft, answer: str, own_words: Iterable[str]) -> FeedbackDraft:
    """Scores within 1 to 5, short lists, and a tightened answer that adds no new numbers."""
    allowed = _numbers(answer) | numbers_of(own_words)
    return FeedbackDraft(
        scores=AnswerScores(
            structure=_score(draft.scores.structure),
            specificity=_score(draft.scores.specificity),
            relevance=_score(draft.scores.relevance),
            length=_score(draft.scores.length),
        ),
        verdict=_clean(draft.verdict, 300),
        worked=[_clean(item, 300) for item in draft.worked if item.strip()][:3],
        improve=[_clean(item, 400) for item in draft.improve if item.strip()][:3],
        better_answer=keep_supported_sentences(draft.better_answer, allowed, keep_prompts=True),
        unsupported=[_clean(item, 300) for item in draft.unsupported if item.strip()][:5],
    )
