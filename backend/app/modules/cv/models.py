"""The CV: words (truth-checked against the profile), a design, and a share link."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Cv(IdMixin, TimestampMixin, Base):
    __tablename__ = "cvs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    template: Mapped[str] = mapped_column(String(20), default="meridian")
    accent: Mapped[str] = mapped_column(String(16), default="ink")
    options: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # CvOptions
    content: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # CvContent
    # The words before the last AI change, so it can be undone.
    previous_content: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # Profile version the words were written from; newer profile → the CV is out of date.
    profile_version: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(12), default="ready")  # ready | working | failed
    stage: Mapped[str | None] = mapped_column(String(24))
    error: Mapped[str | None] = mapped_column(Text)
    last_action: Mapped[str | None] = mapped_column(String(300))
    last_check: Mapped[dict[str, Any] | None] = mapped_column(JSONB)  # FactCheck
    visibility: Mapped[str] = mapped_column(String(8), default="off")  # off | link | public
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # The link-preview image, reused while the shared CV doesn't change.
    og_key: Mapped[str | None] = mapped_column(String(200))
    og_hash: Mapped[str | None] = mapped_column(String(64))
