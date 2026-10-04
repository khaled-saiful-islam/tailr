"""When the next morning brief is due, in the user's own time zone."""

from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

from app.core.clock import utcnow, zone
from app.modules.radar.settings import RadarSettings


def next_brief_at(
    settings: RadarSettings, timezone: str | None, now: datetime | None = None
) -> datetime | None:
    """The next moment (UTC) on a chosen weekday at the chosen local time; None when paused."""
    if settings.paused:
        return None
    tz = zone(timezone)
    local_now = (now or utcnow()).astimezone(tz)
    hour, minute = settings.hour_minute
    for offset in range(0, 8):
        day = local_now.date() + timedelta(days=offset)
        if day.weekday() not in settings.brief_days:
            continue
        candidate = datetime.combine(day, time(hour, minute), tzinfo=tz)
        if candidate > local_now:
            return candidate.astimezone(UTC)
    return None
