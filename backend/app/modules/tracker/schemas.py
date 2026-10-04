"""Tracker API contracts."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.core.schemas import Schema
from app.modules.brief.schemas import JobSummaryOut
from app.modules.tracker.models import EventKind, Stage
from app.modules.tracker.refs import ApplicationRef

__all__ = [
    "ApplicationDetail",
    "ApplicationOut",
    "ApplicationRef",
    "ApplicationUpdate",
    "Board",
    "EventOut",
    "FollowUpDraft",
    "TrackRequest",
]


class FollowUpDraft(Schema):
    subject: str
    body: str
    created_at: datetime


class ApplicationOut(Schema):
    id: uuid.UUID
    stage: Stage
    position: float
    stage_changed_at: datetime
    created_at: datetime
    notes: str | None
    applied_at: datetime | None
    next_step: str | None
    next_step_at: datetime | None
    contact_name: str | None
    contact_email: str | None
    follow_up_due_at: datetime | None
    nudged_at: datetime | None
    followed_up_at: datetime | None
    follow_up_draft: FollowUpDraft | None
    match_id: uuid.UUID | None
    score: int | None
    kit_id: uuid.UUID | None
    kit_status: str | None
    job: JobSummaryOut


class Board(Schema):
    items: list[ApplicationOut]
    counts: dict[str, int]


class EventOut(Schema):
    id: uuid.UUID
    kind: EventKind
    stage: Stage | None
    detail: dict[str, str]
    at: datetime


class ApplicationDetail(ApplicationOut):
    events: list[EventOut]


class TrackRequest(Schema):
    match_id: uuid.UUID
    stage: Stage = Stage.SAVED


class ApplicationUpdate(Schema):
    stage: Stage | None = None
    position: float | None = None
    notes: str | None = Field(default=None, max_length=5000)
    applied_at: datetime | None = None
    next_step: str | None = Field(default=None, max_length=120)
    next_step_at: datetime | None = None
    contact_name: str | None = Field(default=None, max_length=120)
    contact_email: EmailStr | None = None

    @field_validator("notes", "next_step", "contact_name", mode="before")
    @classmethod
    def _blank_is_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("contact_email", mode="before")
    @classmethod
    def _blank_email(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value
