"""Interview prep shapes: what the AI writes, what's kept on the kit, and what the API returns.

The full plan, practice answers and "confident / needs practice" marks are kept inside the
kit's `extras` JSON (keys in `STORED_KEYS`), so rebuilding the application keeps them.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.core.schemas import Schema
from app.modules.kits.schemas import Language

QuestionKind = Literal["role", "experience", "motivation", "gap", "situational"]
Mark = Literal["confident", "practice"]

PLAN_KEY = "interview_plan"
PRACTICE_KEY = "interview_practice"
MARKS_KEY = "interview_marks"
STORED_KEYS = (PLAN_KEY, PRACTICE_KEY, MARKS_KEY)
PITCH_ID = "pitch"


# ── What the AI writes ───────────────────────────────────────────────────


class StarStory(BaseModel):
    situation: str
    task: str
    action: str
    result: str
    fact_ids: list[str] = Field(default_factory=list)


class QuestionDraft(BaseModel):
    kind: QuestionKind
    question: str
    why_they_ask: str
    strong_answer: list[str] = Field(default_factory=list)
    story: StarStory | None = None
    follow_ups: list[str] = Field(default_factory=list)
    pitfall: str = ""
    skill: str | None = None


class SkillQuestionsDraft(BaseModel):
    """Questions about the job's skills, the skills the profile lacks, and its situations."""

    questions: list[QuestionDraft] = Field(default_factory=list)


class PitchDraft(BaseModel):
    text: str
    fact_ids: list[str] = Field(default_factory=list)


class AskThem(BaseModel):
    question: str
    why: str


class StoryPlanDraft(BaseModel):
    """The pitch, past-work and motivation questions, questions to ask, and a checklist."""

    pitch: PitchDraft
    questions: list[QuestionDraft] = Field(default_factory=list)
    ask_them: list[AskThem] = Field(default_factory=list)
    checklist: list[str] = Field(default_factory=list)


class AnswerScores(BaseModel):
    structure: int
    specificity: int
    relevance: int
    length: int


class FeedbackDraft(BaseModel):
    scores: AnswerScores
    verdict: str
    worked: list[str] = Field(default_factory=list)
    improve: list[str] = Field(default_factory=list)
    better_answer: str
    unsupported: list[str] = Field(default_factory=list)


# ── Kept on the kit, and returned ────────────────────────────────────────


class PlanQuestion(Schema):
    id: str
    kind: QuestionKind
    question: str
    why_they_ask: str
    strong_answer: list[str] = Field(default_factory=list)
    story: StarStory | None = None
    follow_ups: list[str] = Field(default_factory=list)
    pitfall: str = ""
    skill: str | None = None


class Pitch(Schema):
    text: str
    fact_ids: list[str] = Field(default_factory=list)
    seconds: int


class InterviewPlan(Schema):
    language: Language
    built_at: datetime
    pitch: Pitch
    questions: list[PlanQuestion] = Field(default_factory=list)
    ask_them: list[AskThem] = Field(default_factory=list)
    checklist: list[str] = Field(default_factory=list)
    # Must-have skills the profile doesn't show: the interviewer will probe them.
    gaps: list[str] = Field(default_factory=list)
    # Stories left out because they claimed more than the profile says.
    stories_removed: int = 0


class PracticeAttempt(Schema):
    question_id: str
    answer: str
    words: int
    seconds: int
    feedback: FeedbackDraft
    created_at: datetime


class BasicQuestion(Schema):
    """One of the five questions prepared with the application, with an id for marks."""

    id: str
    question: str
    why_they_ask: str
    your_story: str
    fact_ids: list[str] = Field(default_factory=list)


class InterviewPrepOut(Schema):
    kit_id: uuid.UUID
    job_title: str
    company: str
    language: Language
    ready: bool  # the application itself is ready (a plan needs it)
    basic: list[BasicQuestion] = Field(default_factory=list)
    plan: InterviewPlan | None = None
    practice: dict[str, PracticeAttempt] = Field(default_factory=dict)
    marks: dict[str, Mark] = Field(default_factory=dict)


class MarkUpdate(Schema):
    question_id: str = Field(min_length=1, max_length=40)
    mark: Mark | None = None


class FeedbackRequest(Schema):
    question_id: str = Field(min_length=1, max_length=40)
    answer: str = Field(min_length=1, max_length=4000)
