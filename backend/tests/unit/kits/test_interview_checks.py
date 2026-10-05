"""Interview prep truth checks: stories, the pitch and tightened answers claim only real facts."""

from __future__ import annotations

from app.modules.kits.checks import FactSource
from app.modules.kits.interview_checks import (
    check_feedback,
    check_story,
    keep_supported_sentences,
    numbers_of,
    question_id,
    spoken_seconds,
    word_count,
)
from app.modules.kits.interview_schemas import AnswerScores, FeedbackDraft, StarStory

F1 = "86801513106b"
SOURCES = {
    "86801513106b": FactSource(
        "86801513106b", "r1", "AI Engineer at Selat Pay", "Built a RAG assistant for 40k staff."
    ),
    "9a1b2c3d4e5f": FactSource(
        "9a1b2c3d4e5f", "r1", "AI Engineer at Selat Pay", "Cut serving cost by 38%."
    ),
}


def _story(result: str, fact_ids: list[str]) -> StarStory:
    return StarStory(
        situation="Staff needed answers.",
        task="Build it.",
        action="Built a RAG assistant [fact 86801513106b].",
        result=result,
        fact_ids=fact_ids,
    )


def test_question_ids_ignore_case_and_punctuation() -> None:
    assert question_id("Why Selat Pay?") == question_id("why  selat pay")
    assert question_id("Why Selat Pay?") != question_id("Why this role?")


def test_a_story_keeps_only_what_its_facts_support() -> None:
    kept = check_story(_story("Used by 40,000 staff.", [F1, F1, "zz"]), SOURCES)
    assert kept is not None
    assert kept.fact_ids == [F1]
    assert kept.action == "Built a RAG assistant."  # citation tag removed
    assert check_story(_story("Saved 2 million ringgit.", [F1]), SOURCES) is None
    assert check_story(_story("Used by 40,000 staff.", ["zz"]), SOURCES) is None
    assert check_story(_story("Cut cost by [X]%.", ["9a1b2c3d4e5f"]), SOURCES) is None
    assert check_story(None, SOURCES) is None


def test_sentences_with_unsupported_numbers_are_dropped() -> None:
    allowed = numbers_of(source.text for source in SOURCES.values())
    text = "I built an assistant for 40,000 staff. It made 3 million. I cut cost by 38%."
    assert keep_supported_sentences(text, allowed) == (
        "I built an assistant for 40,000 staff. I cut cost by 38%."
    )


def test_prompts_to_fill_in_can_stay_in_a_practice_answer() -> None:
    text = "I cut cost by 38%. I found it by [how, in [2] steps]. Fill [this]."
    allowed = {"38%"}
    assert keep_supported_sentences(text, allowed) == "I cut cost by 38%."
    assert keep_supported_sentences(text, allowed, keep_prompts=True) == text


def test_feedback_is_clamped_and_adds_nothing_new() -> None:
    draft = FeedbackDraft(
        scores=AnswerScores(structure=9, specificity=-1, relevance=3, length=5),
        verdict="Good start.",
        worked=["a", "b", "c", "d"],
        improve=["x", " ", "y"],
        better_answer="I led 4 engineers. We shipped in 2 weeks. It worked.",
        unsupported=[],
    )
    checked = check_feedback(draft, "I led 4 engineers and it worked.", ["Cut cost by 38%."])
    assert checked.scores == AnswerScores(structure=5, specificity=1, relevance=3, length=5)
    assert checked.worked == ["a", "b", "c"]
    assert checked.improve == ["x", "y"]
    assert checked.better_answer == "I led 4 engineers. It worked."


def test_speaking_time_follows_a_calm_pace() -> None:
    assert word_count("One two three, four.") == 4
    assert spoken_seconds("word " * 150) == 60
