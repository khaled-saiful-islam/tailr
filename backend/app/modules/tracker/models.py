"""Applications on the tracker board, and what happened to each one."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy import func as sa_func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Stage(StrEnum):
    SAVED = "saved"
    PREPARING = "preparing"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


# The way forward. Rejected is a side exit from any of them.
PATH = (Stage.SAVED, Stage.PREPARING, Stage.APPLIED, Stage.INTERVIEW, Stage.OFFER)


def step(stage: Stage) -> int:
    """How far along the path a stage is; rejected doesn't move you forward."""
    return PATH.index(stage) if stage in PATH else -1


class Application(IdMixin, TimestampMixin, Base):
    """One job the user is pursuing. One per user and job."""

    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_applications_user_job"),
        Index("ix_applications_user_stage", "user_id", "stage", "position"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")
    )
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="SET NULL")
    )
    kit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kits.id", ondelete="SET NULL")
    )
    stage: Mapped[Stage] = mapped_column(String(16), default=Stage.SAVED)
    # Order inside a column: smaller is higher. New and moved cards go on top.
    position: Mapped[float] = mapped_column(Float, default=0.0)
    # The furthest step along PATH ever reached, for an honest funnel.
    furthest: Mapped[int] = mapped_column(Integer, default=0)
    stage_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sa_func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    next_step: Mapped[str | None] = mapped_column(String(120))
    next_step_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    contact_name: Mapped[str | None] = mapped_column(String(120))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    follow_up_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    nudged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    followed_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    follow_up_draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class EventKind(StrEnum):
    ADDED = "added"
    STAGE = "stage"
    NEXT_STEP = "next_step"
    FOLLOWED_UP = "followed_up"


class ApplicationEvent(IdMixin, Base):
    """A dated line in an application's history."""

    __tablename__ = "application_events"
    __table_args__ = (Index("ix_application_events_app_at", "application_id", "at"),)

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE")
    )
    kind: Mapped[EventKind] = mapped_column(String(16))
    stage: Mapped[Stage | None] = mapped_column(String(16))
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=sa_func.now())
