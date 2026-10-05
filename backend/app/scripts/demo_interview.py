"""A full interview plan for the demo's Teratai Bank application, written by hand.

Every story and number comes from the demo profile's facts, as the real plan's checks
require, so the demo shows the interview prep without calling the AI.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi.encoders import jsonable_encoder

from app.modules.kits.interview_checks import question_id, spoken_seconds
from app.modules.kits.interview_schemas import (
    PLAN_KEY,
    AskThem,
    InterviewPlan,
    Pitch,
    PlanQuestion,
    QuestionDraft,
    StarStory,
)
from app.modules.profile.document import ProfileDocument
from app.scripts.demo_kits import fact_ids

PITCH = (
    "I'm an AI engineer with six years of building search, chat and recommendation systems. "
    "At Selat Pay I built a RAG assistant on internal policies that 40,000 staff across 3 "
    "countries use, with a source for every answer, and it cut policy questions to HR by 50% "
    "in its first quarter. I care about it being right and affordable: a pipeline I set up "
    "checks 1,200 answers every night before release, and I cut model-serving cost by 38%. "
    "Teratai Bank wants GenAI assistants on its own documents, with evaluation and cost in "
    "mind, which is the work I want to keep doing."
)


def _questions(ids: dict[str, str]) -> list[QuestionDraft]:
    return [
        QuestionDraft(
            kind="role",
            question="How would you build an assistant that answers from the bank's own policies?",
            why_they_ask="It's the core of the job: they want to hear your design, not buzzwords.",
            strong_answer=[
                "Walk through the pieces: documents in, search, the answer, the source shown.",
                "Say how you'd measure it before staff see it.",
                "Name what you'd do differently for a bank (access rules, audit).",
            ],
            story=StarStory(
                situation="Staff at Selat Pay kept asking HR the same policy questions.",
                task="Build an assistant they could trust on internal policies.",
                action="Built a RAG assistant that answers with a source for every answer.",
                result="40,000 staff across 3 countries use it; HR questions fell by 50%.",
                fact_ids=[ids["rag"], ids["p_rag"], ids["hr"]],
            ),
            follow_ups=["How did you split the documents?", "What happens when it can't answer?"],
            pitfall="Listing tools without saying why you chose them.",
            skill="Retrieval-augmented generation",
        ),
        QuestionDraft(
            kind="role",
            question="How do you know a new version of the assistant is better, not worse?",
            why_they_ask="Wrong policy answers are a real risk for a bank.",
            strong_answer=[
                "Describe a fixed set of test questions with known answers.",
                "Explain when a release is blocked.",
                "Mention checking sources, not just wording.",
            ],
            story=StarStory(
                situation="Each release of the policy assistant could change its answers.",
                task="Catch regressions before staff saw them.",
                action="Set up an evaluation pipeline that runs every night before release.",
                result="It checks 1,200 answers each night before anything ships.",
                fact_ids=[ids["evals"]],
            ),
            follow_ups=["How did you choose those 1,200 questions?"],
            pitfall="Saying you 'test it manually'.",
            skill="LLM evaluation",
        ),
        QuestionDraft(
            kind="role",
            question="A bank-wide rollout multiplies every cost. How would you keep it affordable?",
            why_they_ask="The ad says cost in mind; they want proof you've done it.",
            strong_answer=[
                "Lead with the number you achieved.",
                "Explain the two techniques in plain words.",
                "Say what you watched so quality didn't drop.",
            ],
            story=StarStory(
                situation="Serving models at Selat Pay was getting expensive.",
                task="Bring the cost down without hurting answers.",
                action="Introduced request batching and quantised models.",
                result="Model-serving cost fell by 38%.",
                fact_ids=[ids["cost"]],
            ),
            follow_ups=["Did quantising change the quality? How did you check?"],
            pitfall="Promising a saving for their system before you've seen it.",
        ),
        QuestionDraft(
            kind="experience",
            question="Tell me about a team you've led.",
            why_they_ask="Senior roles guide others, even without a manager title.",
            strong_answer=[
                "Say what the team delivered and for whom.",
                "Give one decision you made as the lead.",
                "Show how you kept the team unblocked.",
            ],
            story=StarStory(
                situation="The risk team needed to understand why alerts fired.",
                task="Lead the work to explain fraud alerts.",
                action="Led a team of 4 engineers on fraud-alert explanations.",
                result="The risk team got explanations for the alerts they review.",
                fact_ids=[ids["lead"]],
            ),
            follow_ups=["How did you handle a disagreement in the team?"],
            pitfall="Saying 'we' all the way through, so your part disappears.",
        ),
        QuestionDraft(
            kind="experience",
            question="Tell me about a time you made a slow system much faster.",
            why_they_ask="Teams want people who notice waste and fix it.",
            strong_answer=[
                "Give the before and after.",
                "Explain the change in one sentence.",
                "Say who benefited.",
            ],
            story=StarStory(
                situation="At Rimba Commerce, weekly retraining took 9 hours.",
                task="Make retraining fast enough to run without fuss.",
                action="Migrated the training jobs to Kubernetes.",
                result="Weekly retraining went from 9 hours to 2.",
                fact_ids=[ids["k8s"]],
            ),
            follow_ups=["What broke during the move?"],
            pitfall="Going deep on Kubernetes settings instead of the outcome.",
            skill="Kubernetes",
        ),
        QuestionDraft(
            kind="motivation",
            question="Why Teratai Bank, and why this role?",
            why_they_ask="They want someone who chose them, not any AI job.",
            strong_answer=[
                "Connect their plan (assistants on their own documents) to what you've built.",
                "Say what you want to learn or grow into here.",
                "Keep it about them, not salary or title.",
            ],
            follow_ups=["Where do you see this work in two years?"],
            pitfall="A generic answer that would fit any bank.",
        ),
        QuestionDraft(
            kind="gap",
            question="Have you worked with vector databases?",
            why_they_ask="The ad lists them, and your CV doesn't show them.",
            strong_answer=[
                "Be honest about what you've used and what you haven't.",
                "Bridge from the search work you've done in your RAG assistant.",
                "Say how you'd get up to speed in the first weeks.",
            ],
            follow_ups=["Which would you pick for a bank, and why?"],
            pitfall="Claiming experience you don't have; they will ask a second question.",
            skill="Vector databases",
        ),
        QuestionDraft(
            kind="situational",
            question="The assistant gives a confident but wrong answer about a policy. What now?",
            why_they_ask="They want to see calm, careful handling of a real risk.",
            strong_answer=[
                "Contain it first: tell people, stop the wrong answer spreading.",
                "Find the cause using the source the answer showed.",
                "Add the case to your nightly checks so it can't come back.",
            ],
            follow_ups=["Who would you tell, and when?"],
            pitfall="Blaming the model instead of owning the fix.",
        ),
    ]


def _plan_question(draft: QuestionDraft) -> PlanQuestion:
    return PlanQuestion(id=question_id(draft.question), **draft.model_dump())


def teratai_plan(document: ProfileDocument, built_at: datetime) -> dict[str, Any]:
    """The plan as it's kept on the kit, under its key in `extras`."""
    ids = fact_ids(document)
    plan = InterviewPlan(
        language="en",
        built_at=built_at,
        pitch=Pitch(
            text=PITCH,
            fact_ids=[ids["rag"], ids["p_rag"], ids["hr"], ids["evals"], ids["cost"]],
            seconds=spoken_seconds(PITCH),
        ),
        questions=[_plan_question(item) for item in _questions(ids)],
        ask_them=[
            AskThem(
                question="Which documents would the first assistant answer from?",
                why="Shows you're already thinking about the real work.",
            ),
            AskThem(
                question="How will you decide the assistant is good enough to launch?",
                why="Tells you how much they value evaluation.",
            ),
            AskThem(
                question="Who would I work with most closely in the first three months?",
                why="Helps you picture the team and the role.",
            ),
        ],
        checklist=[
            "Re-read the ad: GenAI assistants on the bank's own documents, evaluation, cost.",
            "Know your numbers: 40,000 staff, 3 countries, 1,200 answers a night, 38%, 50%.",
            "Have one story ready for each kind of question above.",
            "Prepare an honest answer about vector databases.",
        ],
        gaps=["Vector databases"],
    )
    return {PLAN_KEY: jsonable_encoder(plan)}
