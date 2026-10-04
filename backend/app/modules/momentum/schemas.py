"""Momentum API contracts."""

from __future__ import annotations

from datetime import date

from pydantic import Field

from app.core.schemas import Schema
from app.modules.momentum.streak import DayState


class GoalOut(Schema):
    target: int
    done: int
    week_start: date
    week_end: date
    days_left: int


class DayOut(Schema):
    day: date
    state: DayState


class StreakOut(Schema):
    current: int
    best: int
    checked_today: bool
    week: list[DayOut]


class FunnelOut(Schema):
    saved: int
    preparing: int
    applied: int
    interview: int
    offer: int
    rejected: int


class MomentumOut(Schema):
    goal: GoalOut
    streak: StreakOut
    funnel: FunnelOut


class GoalUpdate(Schema):
    weekly_applications: int = Field(ge=1, le=50)


class SkillOut(Schema):
    name: str
    jobs: int
    share: int
    have: bool


class PayOut(Schema):
    low: int
    high: int
    jobs: int


class CompanyOut(Schema):
    name: str
    jobs: int


class PulseOut(Schema):
    """This week's matched jobs, summed up. `ready` is false until there are enough."""

    ready: bool
    since: date
    jobs: int
    good_fit: int = 0
    skills: list[SkillOut] = Field(default_factory=list)
    pay: PayOut | None = None
    your_minimum: int | None = None
    modes: dict[str, int] = Field(default_factory=dict)
    companies: list[CompanyOut] = Field(default_factory=list)
