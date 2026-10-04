"""A slow piece of work someone asked for, done in the background."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class TaskStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


ACTIVE = (TaskStatus.QUEUED, TaskStatus.RUNNING)


class BackgroundTask(IdMixin, TimestampMixin, Base):
    __tablename__ = "background_tasks"
    __table_args__ = (Index("ix_background_tasks_user_created", "user_id", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    kind: Mapped[str] = mapped_column(String(40))
    status: Mapped[TaskStatus] = mapped_column(String(12), default=TaskStatus.QUEUED)
    title: Mapped[str] = mapped_column(String(200))
    stage: Mapped[str | None] = mapped_column(String(160))
    input: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    # What the work produced (shapes vary by kind), and where to see it.
    result: Mapped[Any] = mapped_column(JSONB, nullable=True)
    link: Mapped[str | None] = mapped_column(String(300))
    error: Mapped[str | None] = mapped_column(Text)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
