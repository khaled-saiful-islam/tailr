"""Interview prep: the full plan, practice feedback and marks, held to the profile's facts."""

from __future__ import annotations

import re
from typing import Any

import httpx
import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.modules.jobs.insights import JobInsights
from app.modules.kits import interview
from app.modules.kits.interview_schemas import (
    AnswerScores,
    AskThem,
    FeedbackDraft,
    PitchDraft,
    QuestionDraft,
    SkillQuestionsDraft,
    StarStory,
    StoryPlanDraft,
)
from app.modules.kits.models import Kit
from app.modules.kits.schemas import (
    CoverLetter,
    InterviewQuestion,
    JudgeVerdict,
    KitExtras,
    TailoredBullet,
    TailoredResume,
    TailoredRole,
    Unsupported,
)
from app.modules.matching.review import FitReview
from app.modules.profile.document import draft_to_document
from tests.background import done, failed
from tests.factories import sample_draft

AD = "We need an AI engineer who builds RAG systems in Python and runs them on Kubernetes. " * 6
ANSWER = (
    "At Selat Pay I built a RAG assistant that 40,000 staff use across 3 countries. "
    "I owned retrieval quality and set up checks before each release, so answers stayed right."
)


def _facts(messages: list[dict[str, Any]]) -> list[str]:
    return [
        line.split("FACT ", 1)[1].split(":", 1)[0]
        for line in messages[-1]["content"].splitlines()
        if "FACT " in line
    ]


def _roles(messages: list[dict[str, Any]]) -> list[str]:
    return [
        line.split("ROLE ", 1)[1].split(":", 1)[0]
        for line in messages[-1]["content"].splitlines()
        if line.startswith("ROLE ")
    ]


def _skills(messages: list[dict[str, Any]], schema: Any) -> SkillQuestionsDraft:
    facts = _facts(messages)
    story = StarStory(
        situation="Staff needed policy answers.",
        task="Build an assistant.",
        action="Built a RAG assistant.",
        result="Used by 40,000 staff across 3 countries.",
        fact_ids=[facts[0]],
    )
    return SkillQuestionsDraft(
        questions=[
            QuestionDraft(
                kind="role",
                question="Walk me through a RAG system you shipped.",
                why_they_ask="It's the core of the job.",
                strong_answer=["Retrieval", "Evaluation", "Cost", "Impact", "Extra"],
                story=story,
                follow_ups=["How did you measure quality?", "What failed?", "Third?"],
                pitfall="Staying abstract.",
                skill="Retrieval-augmented generation",
            ),
            QuestionDraft(
                kind="role",
                question="How would you cut serving cost?",
                why_they_ask="Budgets matter.",
                story=story.model_copy(update={"result": "Cut cost by 90%."}),  # not in facts
            ),
            QuestionDraft(
                kind="gap",
                question="What have you built in Rust?",
                why_they_ask="Rust is a must-have.",
                story=story.model_copy(update={"fact_ids": ["deadbeef0000"]}),  # not a fact
                skill="Rust",
            ),
            QuestionDraft(kind="situational", question="  ", why_they_ask="Empty."),
        ]
    )


def _story(messages: list[dict[str, Any]], schema: Any) -> StoryPlanDraft:
    facts = _facts(messages)
    return StoryPlanDraft(
        pitch=PitchDraft(
            text="I'm an AI engineer at Selat Pay. My assistant serves 40,000 staff. "
            "I also grew revenue by 300%.",
            fact_ids=[facts[0], "notafact"],
        ),
        questions=[
            QuestionDraft(
                kind="experience",
                question="Tell me about a time you led a team.",
                why_they_ask="Leadership.",
                story=StarStory(
                    situation="Fraud alerts needed explaining.",
                    task="Lead the delivery.",
                    action="Led a team of 4 engineers.",
                    result="Delivered fraud explanations.",
                    fact_ids=[facts[2]],
                ),
            ),
            QuestionDraft(
                kind="motivation", question="Why Selat Pay?", why_they_ask="Fit.", story=None
            ),
        ],
        ask_them=[AskThem(question=f"Question {n}?", why="Learn.") for n in range(6)],
        checklist=["Re-read the RAG part of the ad.", "Remember 38% and 99 awards."],
    )


def _feedback(messages: list[dict[str, Any]], schema: Any) -> FeedbackDraft:
    return FeedbackDraft(
        scores=AnswerScores(structure=7, specificity=0, relevance=4, length=3),
        verdict="Clear, but end on the result.",
        worked=["You named the scale."],
        improve=["Open with the result.", "Say what you measured."],
        better_answer="I built a RAG assistant used by 40,000 staff in 3 countries. "
        "I found the issue by [how you found it]. It saved 5 million ringgit. "
        "I led the whole platform team.",
        unsupported=["Owning retrieval quality"],
    )


@pytest.fixture
def ai(fake_ai: FakeAIClient) -> FakeAIClient:
    def tailor(messages: list[dict[str, Any]], schema: Any) -> TailoredResume:
        facts = _facts(messages)
        return TailoredResume(
            headline="AI Engineer",
            summary="AI engineer.",
            roles=[
                TailoredRole(
                    experience_id=_roles(messages)[0],
                    bullets=[TailoredBullet(text="Built a RAG assistant.", fact_ids=[facts[0]])],
                )
            ],
            skills=["Python"],
        )

    extras = KitExtras(
        recruiter_message="Hi!",
        interview=[
            InterviewQuestion(
                question="Tell me about RAG.", why_they_ask="Core.", your_story="I built one."
            )
        ],
    )
    return (
        fake_ai.on("kits.tailor", tailor)
        .on(
            "kits.letter",
            lambda m, s: CoverLetter(greeting="Hi,", paragraphs=["One."], closing="Bye,"),
        )
        .on("kits.extras", lambda m, s: extras)
        .on("kits.judge", lambda m, s: JudgeVerdict())
        .on(
            "jobs.insights",
            lambda m, s: JobInsights(summary="AI role.", required_skills=["Python", "Rust"]),
        )
        .on(
            "matching.review",
            lambda m, s: FitReview(
                headline="Good.", why=["RAG."], skill_coverage=80, experience_fit=90
            ),
        )
        .on("kits.interview_plan", _skills)
        .on("kits.interview_story", _story)
        .on("kits.interview_feedback", _feedback)
    )


async def _kit(client: httpx.AsyncClient) -> str:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    await client.put("/api/v1/profile", json={"document": document, "version": 0})
    pasted = await client.post(
        "/api/v1/jobs/paste", json={"title": "AI Engineer", "company": "Selat Pay", "text": AD}
    )
    match_id = done(pasted)["match_id"]
    created = await client.post("/api/v1/kits", json={"match_id": match_id})
    assert created.status_code == 202, created.text
    return str(created.json()["id"])


async def test_full_plan_is_built_in_the_background_and_held_to_the_facts(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    kit_id = await _kit(signed_in)
    url = f"/api/v1/kits/{kit_id}/interview"
    before = (await signed_in.get(url)).json()
    assert before["ready"] is True
    assert before["plan"] is None
    assert [q["question"] for q in before["basic"]] == ["Tell me about RAG."]
    assert before["basic"][0]["id"]

    started = await signed_in.post(f"{url}/plan")
    assert done(started) == {"questions": 5}
    task = (await signed_in.get(f"/api/v1/tasks/{started.json()['id']}")).json()
    assert task["link"] == f"/apply/{kit_id}?tab=interview"

    plan = (await signed_in.get(url)).json()["plan"]
    # Grouped by kind; the blank question is dropped.
    kinds = [q["kind"] for q in plan["questions"]]
    assert kinds == ["role", "role", "experience", "gap", "motivation"]
    assert plan["gaps"] == ["Rust"]
    prompt = ai.calls_for("kits.interview_plan")[0].messages[-1]["content"]
    assert "GAPS: Rust" in prompt
    by_question = {q["question"]: q for q in plan["questions"]}
    # A story with a number its fact doesn't have, or citing no real fact, is left out.
    assert by_question["Walk me through a RAG system you shipped."]["story"]["fact_ids"]
    assert by_question["How would you cut serving cost?"]["story"] is None
    assert by_question["What have you built in Rust?"]["story"] is None
    assert plan["stories_removed"] == 2
    first = by_question["Walk me through a RAG system you shipped."]
    assert len(first["strong_answer"]) == 4
    assert len(first["follow_ups"]) == 2
    # The invented 300% sentence is dropped; the pitch keeps real facts only.
    assert "300%" not in plan["pitch"]["text"]
    assert "40,000 staff" in plan["pitch"]["text"]
    assert plan["pitch"]["fact_ids"]
    assert "notafact" not in plan["pitch"]["fact_ids"]
    assert plan["pitch"]["seconds"] > 0
    assert len(plan["ask_them"]) == 5
    assert plan["checklist"] == ["Re-read the RAG part of the ad."]

    notes = (await signed_in.get("/api/v1/notifications")).json()["items"]
    assert notes[0]["title"] == "Your interview plan is ready"
    assert notes[0]["link"] == f"/apply/{kit_id}?tab=interview"


async def test_practice_feedback_is_kept_and_adds_nothing_new(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    kit_id = await _kit(signed_in)
    url = f"/api/v1/kits/{kit_id}/interview"
    qid = (await signed_in.get(url)).json()["basic"][0]["id"]

    short = await signed_in.post(
        f"{url}/feedback", json={"question_id": qid, "answer": "I built it."}
    )
    assert short.status_code == 422
    assert short.json()["error"]["code"] == "answer_too_short"
    unknown = await signed_in.post(
        f"{url}/feedback", json={"question_id": "nope", "answer": ANSWER}
    )
    assert unknown.status_code == 404

    def judge(messages: list[dict[str, Any]], schema: Any) -> JudgeVerdict:
        items = re.findall(r"^(\d+)\. (.+)$", messages[-1]["content"], re.MULTILINE)
        flagged = [n for n, text in items if "whole platform team" in text]
        return JudgeVerdict(unsupported=[Unsupported(index=int(n), reason="new") for n in flagged])

    ai.on("kits.interview_judge", judge)
    result = done(
        await signed_in.post(f"{url}/feedback", json={"question_id": qid, "answer": ANSWER})
    )
    assert result["feedback"]["scores"] == {
        "structure": 5,
        "specificity": 1,
        "relevance": 4,
        "length": 3,
    }
    # No new numbers, no claims the judge can't trace; prompts to fill in stay.
    assert result["feedback"]["better_answer"] == (
        "I built a RAG assistant used by 40,000 staff in 3 countries. "
        "I found the issue by [how you found it]."
    )

    kept = (await signed_in.get(url)).json()["practice"][qid]
    assert kept["answer"] == ANSWER
    assert kept["words"] > 20
    assert kept["seconds"] > 0
    assert kept["feedback"]["unsupported"] == ["Owning retrieval quality"]


async def test_marks_and_plans_survive_rebuilding_the_application(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    kit_id = await _kit(signed_in)
    url = f"/api/v1/kits/{kit_id}/interview"
    done(await signed_in.post(f"{url}/plan"))
    plan = (await signed_in.get(url)).json()["plan"]
    qid = plan["questions"][0]["id"]

    marked = await signed_in.put(f"{url}/marks", json={"question_id": qid, "mark": "confident"})
    assert marked.json()["marks"] == {qid: "confident"}
    pitch = await signed_in.put(f"{url}/marks", json={"question_id": "pitch", "mark": "practice"})
    assert pitch.json()["marks"] == {qid: "confident", "pitch": "practice"}
    bad = await signed_in.put(f"{url}/marks", json={"question_id": "nope", "mark": "confident"})
    assert bad.status_code == 404

    redone = await signed_in.post(f"/api/v1/kits/{kit_id}/regenerate", json={"tone": "warm"})
    assert redone.status_code == 202
    after = (await signed_in.get(url)).json()
    assert after["plan"]["questions"][0]["id"] == qid
    assert after["marks"] == {qid: "confident", "pitch": "practice"}

    cleared = await signed_in.put(f"{url}/marks", json={"question_id": qid, "mark": None})
    assert cleared.json()["marks"] == {"pitch": "practice"}


async def test_plans_wait_for_the_application_and_are_limited(
    signed_in: httpx.AsyncClient,
    ai: FakeAIClient,
    db: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    kit_id = await _kit(signed_in)
    url = f"/api/v1/kits/{kit_id}/interview"
    await db.execute(update(Kit).where(Kit.id == kit_id).values(status="building"))
    await db.flush()
    waiting = await signed_in.post(f"{url}/plan")
    assert waiting.status_code == 409
    assert waiting.json()["error"]["code"] == "kit_not_ready"
    await db.execute(update(Kit).where(Kit.id == kit_id).values(status="ready"))
    await db.flush()

    monkeypatch.setattr(interview, "PLANS_PER_DAY", 1)
    done(await signed_in.post(f"{url}/plan"))
    assert (await signed_in.post(f"{url}/plan")).status_code == 429


async def test_a_failed_plan_says_so(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    kit_id = await _kit(signed_in)
    del ai.handlers["kits.interview_story"]
    assert failed(await signed_in.post(f"/api/v1/kits/{kit_id}/interview/plan"))
    notes = (await signed_in.get("/api/v1/notifications")).json()["items"]
    assert notes[0]["title"] == "Your interview plan didn't finish"


async def test_interview_prep_is_private(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    kit_id = await _kit(signed_in)
    url = f"/api/v1/kits/{kit_id}/interview"
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    assert (await signed_in.get(url)).status_code == 404
    assert (await signed_in.post(f"{url}/plan")).status_code == 404
    feedback = await signed_in.post(f"{url}/feedback", json={"question_id": "x", "answer": ANSWER})
    assert feedback.status_code == 404
    marks = await signed_in.put(f"{url}/marks", json={"question_id": "x", "mark": "confident"})
    assert marks.status_code == 404


async def test_the_honesty_check_drops_merged_claims(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    def story(messages: list[dict[str, Any]], schema: Any) -> StoryPlanDraft:
        draft = _story(messages, schema)
        pitch = draft.pitch.model_copy(
            update={"text": "I'm an AI engineer at Selat Pay. I led a team of 4 to build it."}
        )
        return draft.model_copy(update={"pitch": pitch})

    def judge(messages: list[dict[str, Any]], schema: Any) -> JudgeVerdict:
        items = re.findall(r"^(\d+)\. (.+)$", messages[-1]["content"], re.MULTILINE)
        flagged = [n for n, text in items if "team of 4" in text or "Delivered fraud" in text]
        return JudgeVerdict(
            unsupported=[Unsupported(index=int(n), reason="merged") for n in flagged]
        )

    ai.on("kits.interview_story", story).on("kits.interview_judge", judge)
    kit_id = await _kit(signed_in)
    done(await signed_in.post(f"/api/v1/kits/{kit_id}/interview/plan"))
    plan = (await signed_in.get(f"/api/v1/kits/{kit_id}/interview")).json()["plan"]
    assert plan["pitch"]["text"] == "I'm an AI engineer at Selat Pay."
    led = next(q for q in plan["questions"] if q["kind"] == "experience")
    assert led["story"] is None
    assert plan["stories_removed"] == 3  # two by the number checks, one by the judge
