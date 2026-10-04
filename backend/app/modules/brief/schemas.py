from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from app.core.schemas import Schema
from app.modules.brief.models import BriefStatus, MatchStatus
from app.modules.sources.base import WorkMode


class JobSummaryOut(Schema):
    id: uuid.UUID
    source: str
    url: str
    title: str
    company: str
    location: str | None
    work_mode: WorkMode | None
    employment_type: str | None
    posted_at: datetime | None
    posted_text: str | None
    salary_text: str | None
    salary_min: int | None
    salary_max: int | None
    company_logo: str | None
    applicants: str | None


class GapOut(Schema):
    text: str
    kind: str
    tip: str


class ReviewOut(Schema):
    headline: str | None = None
    why: list[str] = []
    matched: list[str] = []
    missing: list[str] = []
    gaps: list[GapOut] = []


class MatchOut(Schema):
    id: uuid.UUID
    score: int
    parts: dict[str, int]
    status: MatchStatus
    origin: str
    created_at: datetime
    review: ReviewOut
    job: JobSummaryOut


class InsightsOut(Schema):
    summary: str
    required_skills: list[str]
    nice_skills: list[str]
    min_years: int | None
    seniority: str | None
    languages: list[str]
    education: str | None
    agency: bool
    concerns: list[str]


class RequirementOut(Schema):
    skill: str
    have: bool


class MatchDetailOut(MatchOut):
    description: str | None
    insights: InsightsOut | None
    requirements: list[RequirementOut]


class BriefOut(Schema):
    id: uuid.UUID
    status: BriefStatus
    stage: str
    trigger: str
    local_date: date
    created_at: datetime
    finished_at: datetime | None
    stats: dict[str, Any]
    error: str | None
    matches: list[MatchOut]


class TodayOut(Schema):
    brief: BriefOut | None
    next_brief_at: datetime | None
    radar_ready: bool
    profile_ready: bool


class MatchUpdate(Schema):
    status: Literal["seen", "saved", "dismissed", "new"]


class MatchPage(Schema):
    items: list[MatchOut]
    total: int
    counts: dict[str, int]
