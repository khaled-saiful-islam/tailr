from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin


class SourceRun(IdMixin, Base):
    """One request batch to a job source: for health checks and debugging."""

    __tablename__ = "source_runs"

    source: Mapped[str] = mapped_column(String(32), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # search | details
    query: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(16))  # ok | failed | cached
    results: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
