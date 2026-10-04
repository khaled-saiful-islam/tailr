"""Admin API contracts."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import Field

from app.core.schemas import Schema
from app.modules.auth.models import Role


class PurposeUse(Schema):
    purpose: str
    tokens: int
    calls: int


class DayUse(Schema):
    day: date
    tokens: int


class SourceHealth(Schema):
    source: str
    runs: int
    failed: int
    empty: int
    last_ok_at: datetime | None
    last_error: str | None


class Overview(Schema):
    """The last 24 hours unless a field says otherwise."""

    users: int
    active_7d: int
    new_7d: int
    disabled: int
    tokens_24h: int
    tokens_30d: int
    calls_24h: int
    errors_24h: int
    default_budget: int
    purposes_30d: list[PurposeUse]
    days: list[DayUse]
    sources: list[SourceHealth]


class AdminUserRow(Schema):
    id: uuid.UUID
    name: str
    email: str
    username: str | None
    role: Role
    is_active: bool
    is_demo: bool
    ai_enabled: bool
    ai_daily_budget: int | None
    created_at: datetime
    last_login_at: datetime | None
    tokens_24h: int
    tokens_30d: int


class AdminUserPage(Schema):
    items: list[AdminUserRow]
    total: int


class AdminUserDetail(AdminUserRow):
    default_budget: int
    calls_30d: int
    errors_30d: int
    signed_in_devices: int
    purposes_30d: list[PurposeUse]
    days: list[DayUse]
    applications: int
    kits: int
    matches: int


class AdminUserUpdate(Schema):
    """Only the fields sent change. `ai_daily_budget: null` returns to the default."""

    is_active: bool | None = None
    ai_enabled: bool | None = None
    ai_daily_budget: int | None = Field(default=None, ge=0, le=100_000_000)
    role: Role | None = None
