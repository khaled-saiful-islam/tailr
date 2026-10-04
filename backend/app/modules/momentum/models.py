"""A user's weekly goal and the days they checked their brief."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer
from sqlalchemy import func as sa_func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin

DEFAULT_WEEKLY_GOAL = 5


class Goal(TimestampMixin, Base):
    """How many applications a week the user aims for."""

    __tablename__ = "goals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    weekly_applications: Mapped[int] = mapped_column(Integer, default=DEFAULT_WEEKLY_GOAL)


class ActivityDay(Base):
    """A local day on which the user opened their brief. The streak counts these."""

    __tablename__ = "activity_days"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=sa_func.now()
    )
