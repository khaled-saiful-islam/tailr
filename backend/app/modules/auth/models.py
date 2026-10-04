from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, true
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.clock import DEFAULT_TIMEZONE
from app.core.db import Base, IdMixin, TimestampMixin


class OnboardingStep(StrEnum):
    """Where a new user is in the first-run flow. `done` unlocks the app."""

    IMPORT = "import"
    REVIEW = "review"
    RADAR = "radar"
    DONE = "done"


class Role(StrEnum):
    USER = "user"
    ADMIN = "admin"


class Theme(StrEnum):
    SYSTEM = "system"
    LIGHT = "light"
    DARK = "dark"


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    # Optional short sign-in name (the seeded admin signs in as "admin").
    username: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    role: Mapped[Role] = mapped_column(String(16), default=Role.USER)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(64), default=DEFAULT_TIMEZONE)
    theme: Mapped[Theme] = mapped_column(String(16), default=Theme.SYSTEM)
    onboarding_step: Mapped[OnboardingStep] = mapped_column(
        String(16), default=OnboardingStep.IMPORT
    )
    email_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Set by an admin: AI on or off for this user, and their own daily token allowance
    # (null means the default from settings).
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    ai_daily_budget: Mapped[int | None] = mapped_column(Integer)


class Session(IdMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(300))
    ip_address: Mapped[str | None] = mapped_column(String(64))
