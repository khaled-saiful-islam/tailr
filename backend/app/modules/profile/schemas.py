from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.core.schemas import Schema
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import ImportStatus


class StrengthCheckOut(Schema):
    key: str
    label: str
    weight: int
    done: bool
    hint: str


class BulletIssueOut(Schema):
    bullet_id: str
    issues: list[Literal["placeholder", "weak_opener", "no_metric", "too_short", "too_long"]]


class StrengthOut(Schema):
    score: int
    checks: list[StrengthCheckOut]
    bullet_issues: list[BulletIssueOut]


class ProfileOut(Schema):
    exists: bool
    document: ProfileDocument
    version: int
    strength: StrengthOut
    updated_at: datetime | None


class ProfileUpdate(Schema):
    document: ProfileDocument
    version: int = Field(ge=0, description="The version you edited; 0 creates the profile.")


class ImportStats(Schema):
    experiences: int
    achievements: int
    skills: int
    education: int
    projects: int


class ImportOut(Schema):
    id: uuid.UUID
    status: ImportStatus
    filename: str
    file_kind: str
    error: str | None
    used_vision: bool
    created_at: datetime
    updated_at: datetime
    draft: ProfileDocument | None = None
    stats: ImportStats | None = None


class TextImportRequest(Schema):
    text: str = Field(min_length=80, max_length=60_000)


class ApplyImportRequest(Schema):
    mode: Literal["replace", "merge"] = "replace"


class CoachBulletRequest(Schema):
    text: str = Field(min_length=3, max_length=600)
    title: str | None = Field(default=None, max_length=160)
    company: str | None = Field(default=None, max_length=160)


class CoachBulletOut(Schema):
    suggestion: str
    reason: str
    questions: list[str]


class SummaryOut(Schema):
    summary: str


# ── AI answer shapes ─────────────────────────────────────────────────────


class CoachAnswer(BaseModel):
    suggestion: str
    reason: str
    questions: list[str]


class SummaryAnswer(BaseModel):
    summary: str
