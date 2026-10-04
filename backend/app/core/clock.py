"""Time helpers. Everything is stored in UTC; user time zones apply at the edge."""

from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "Asia/Kuala_Lumpur"


def utcnow() -> datetime:
    return datetime.now(UTC)


def zone(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def local_now(timezone: str | None) -> datetime:
    return utcnow().astimezone(zone(timezone))


def local_today(timezone: str | None) -> date:
    return local_now(timezone).date()


def is_valid_timezone(name: str) -> bool:
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return False
    return True
