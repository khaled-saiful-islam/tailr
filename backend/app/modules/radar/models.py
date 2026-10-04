from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Radar(IdMixin, TimestampMixin, Base):
    """One per user. `settings` is a validated `RadarSettings`."""

    __tablename__ = "radars"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    # When the scheduler should next build this user's brief (UTC). Null when paused.
    next_brief_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
