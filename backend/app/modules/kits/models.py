from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Kit(IdMixin, TimestampMixin, Base):
    """Everything needed to apply for one job: one per user and job, regenerated in place."""

    __tablename__ = "kits"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_kits_user_job"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE")
    )
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(16), default="building")  # building|ready|failed
    stage: Mapped[str] = mapped_column(String(32), default="reading")
    error: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(4), default="en")
    tone: Mapped[str] = mapped_column(String(16), default="confident")
    version: Mapped[int] = mapped_column(Integer, default=1)
    resume: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    cover_letter: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    extras: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    fact_check: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    keywords: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
