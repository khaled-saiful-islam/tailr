"""A person's public page: how their profile is shown to the world, and who looked."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class PublicProfile(IdMixin, TimestampMixin, Base):
    __tablename__ = "public_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    slug: Mapped[str] = mapped_column(String(40), unique=True)  # always lowercase
    visibility: Mapped[str] = mapped_column(String(8), default="off")  # off | link | public
    template: Mapped[str] = mapped_column(String(20), default="blueprint")
    appearance: Mapped[str] = mapped_column(String(8), default="auto")  # auto | light | dark
    # Presentation choices (photo, availability, highlights, project images, sections):
    # a PageSettings document.
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # The link-preview image, rendered on demand and reused while its inputs don't change.
    og_key: Mapped[str | None] = mapped_column(String(200))
    og_hash: Mapped[str | None] = mapped_column(String(64))


class PublicProfileViews(Base):
    """Visits per day, counted once per visitor per day; bots and the owner aren't counted."""

    __tablename__ = "public_profile_views"

    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("public_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    views: Mapped[int] = mapped_column(Integer, default=0)
    # Where visits came from: {"linkedin": 3, "whatsapp": 5, "qr": 1, "other": 2}
    sources: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
