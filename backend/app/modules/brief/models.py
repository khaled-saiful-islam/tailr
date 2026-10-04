"""Morning briefs and the per-user job matches they deliver."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class BriefStatus(StrEnum):
    BUILDING = "building"
    READY = "ready"
    FAILED = "failed"


class Brief(IdMixin, TimestampMixin, Base):
    __tablename__ = "briefs"
    __table_args__ = (Index("ix_briefs_user_created", "user_id", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    local_date: Mapped[date] = mapped_column(Date)
    trigger: Mapped[str] = mapped_column(String(16))  # scheduled | manual
    status: Mapped[BriefStatus] = mapped_column(String(16), default=BriefStatus.BUILDING)
    stage: Mapped[str] = mapped_column(String(32), default="searching")
    stats: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    error: Mapped[str | None] = mapped_column(Text)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    emailed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MatchStatus(StrEnum):
    NEW = "new"
    SEEN = "seen"
    SAVED = "saved"
    DISMISSED = "dismissed"


class Match(IdMixin, Base):
    """One job for one user: its Fit score, the reasons, and what the user did with it."""

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_matches_user_job"),
        Index("ix_matches_user_status_created", "user_id", "status", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")
    )
    brief_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("briefs.id", ondelete="SET NULL"), index=True
    )
    origin: Mapped[str] = mapped_column(String(16), default="brief")  # brief | pasted
    score: Mapped[int] = mapped_column(Integer)
    parts: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
    review: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    status: Mapped[MatchStatus] = mapped_column(String(16), default=MatchStatus.NEW)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
