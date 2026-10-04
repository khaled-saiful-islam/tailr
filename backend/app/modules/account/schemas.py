"""Account API contracts."""

from __future__ import annotations

from pydantic import Field

from app.core.schemas import Schema


class UsageOut(Schema):
    """Today's AI use against your allowance (0 means no limit)."""

    ai_enabled: bool
    tokens_today: int
    daily_budget: int
    calls_today: int


class DeleteAccountRequest(Schema):
    password: str = Field(min_length=1, max_length=200)
