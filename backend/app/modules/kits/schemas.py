"""Apply Kit shapes: what the AI writes, and what the API returns."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.core.schemas import Schema

Language = Literal["en", "ms"]
Tone = Literal["confident", "warm", "concise"]


# ── Tailored resume (every line cites the facts it came from) ───────────


class TailoredBullet(BaseModel):
    text: str = Field(max_length=400)
    fact_ids: list[str] = Field(default_factory=list)


class TailoredRole(BaseModel):
    experience_id: str
    bullets: list[TailoredBullet] = Field(default_factory=list)


class TailoredProject(BaseModel):
    project_id: str
    bullets: list[TailoredBullet] = Field(default_factory=list)


class TailoredResume(BaseModel):
    headline: str = Field(max_length=200)
    summary: str = Field(max_length=1200)
    roles: list[TailoredRole] = Field(default_factory=list)
    projects: list[TailoredProject] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


# ── Cover letter and the rest of the kit ─────────────────────────────────


class CoverLetter(BaseModel):
    greeting: str = Field(max_length=200)
    paragraphs: list[str] = Field(default_factory=list)
    closing: str = Field(max_length=200)


class ScreeningAnswer(BaseModel):
    question: str
    answer: str


class InterviewQuestion(BaseModel):
    question: str
    why_they_ask: str
    your_story: str
    fact_ids: list[str] = Field(default_factory=list)


class KitExtras(BaseModel):
    screening: list[ScreeningAnswer] = Field(default_factory=list)
    recruiter_message: str = ""
    interview: list[InterviewQuestion] = Field(default_factory=list)


class FactIssue(BaseModel):
    where: str  # "Senior AI Engineer at Selat Pay, line 2"
    problem: str
    fixed: bool
    original: str
    replaced_with: str | None = None


class FactCheck(BaseModel):
    lines_checked: int
    issues: list[FactIssue] = Field(default_factory=list)
    # Skills the AI listed that aren't in the profile; left off the resume.
    skills_removed: list[str] = Field(default_factory=list)


class Unsupported(BaseModel):
    """The AI judge's answer: lines that claim more than their cited facts say."""

    index: int
    reason: str


class JudgeVerdict(BaseModel):
    unsupported: list[Unsupported] = Field(default_factory=list)


class KeywordReport(BaseModel):
    before: int  # % of the job's skills your master profile shows
    after: int  # % the tailored resume shows
    covered: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)


# ── API ──────────────────────────────────────────────────────────────────


class KitCreate(Schema):
    match_id: uuid.UUID
    language: Language = "en"
    tone: Tone = "confident"


class KitRegenerate(Schema):
    language: Language | None = None
    tone: Tone | None = None


class KitUpdate(Schema):
    version: int
    resume: TailoredResume | None = None
    cover_letter: CoverLetter | None = None


class FactRef(Schema):
    id: str
    text: str
    owner: str


class SectionRef(Schema):
    """A role or project from the profile, so the editor can name each block."""

    id: str
    kind: Literal["role", "project"]
    label: str


class KitOut(Schema):
    id: uuid.UUID
    match_id: uuid.UUID | None
    job_id: uuid.UUID
    job_title: str
    company: str
    job_url: str
    score: int | None
    status: str
    stage: str
    error: str | None
    language: Language
    tone: Tone
    version: int
    resume: TailoredResume | None
    cover_letter: CoverLetter | None
    extras: KitExtras | None
    fact_check: FactCheck | None
    keywords: KeywordReport | None
    facts: list[FactRef]
    sections: list[SectionRef]
    candidate_name: str | None
    created_at: datetime
    updated_at: datetime


class KitSummaryOut(Schema):
    id: uuid.UUID
    match_id: uuid.UUID | None
    job_title: str
    company: str
    status: str
    language: Language
    updated_at: datetime
