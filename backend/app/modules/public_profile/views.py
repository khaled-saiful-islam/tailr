"""Count visits without cookies: once per visitor per day, never bots or the owner.

A visitor is a salted hash of IP and browser for the day, kept in Redis for two days;
nothing that identifies a person is stored.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from datetime import date
from urllib.parse import urlsplit

from sqlalchemy import text

from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.logging import get_logger
from app.core.redis import get_redis

log = get_logger(__name__)

_BOT = re.compile(
    r"bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|linkedin|embedly|"
    r"curl|wget|python|httpx|headless|lighthouse|monitor",
    re.I,
)
SOURCES = ("linkedin", "whatsapp", "qr", "other")


def is_bot(user_agent: str | None) -> bool:
    return not user_agent or bool(_BOT.search(user_agent))


def source_of(referer: str | None, src: str | None) -> str:
    if src and src.lower() in SOURCES:
        return src.lower()
    host = (urlsplit(referer).hostname or "") if referer else ""
    if host.endswith(("linkedin.com", "lnkd.in")):
        return "linkedin"
    if host.endswith(("whatsapp.com", "wa.me")):
        return "whatsapp"
    return "other"


def visitor_key(ip: str, user_agent: str, day: date) -> str:
    salt = get_settings().secret_key
    return hashlib.sha256(f"{salt}|{day.isoformat()}|{ip}|{user_agent}".encode()).hexdigest()[:32]


_UPSERT = text(
    """
    INSERT INTO public_profile_views (profile_id, day, views, sources)
    VALUES (:profile_id, :day, 1, jsonb_build_object(CAST(:source AS text), 1))
    ON CONFLICT (profile_id, day) DO UPDATE SET
      views = public_profile_views.views + 1,
      sources = public_profile_views.sources || jsonb_build_object(
        CAST(:source AS text),
        COALESCE((public_profile_views.sources ->> CAST(:source AS text))::int, 0) + 1
      )
    """
)


async def count_view(
    profile_id: uuid.UUID, *, ip: str, user_agent: str | None, source: str
) -> bool:
    """Record a visit; returns whether it counted. Never fails the page."""
    if is_bot(user_agent):
        return False
    today = utcnow().date()
    try:
        key = f"pview:{profile_id}:{visitor_key(ip, user_agent or '', today)}"
        if not await get_redis().set(key, "1", nx=True, ex=2 * 24 * 3600):
            return False
        async with session_scope() as db:
            await db.execute(_UPSERT, {"profile_id": profile_id, "day": today, "source": source})
        return True
    except Exception:
        log.warning("profile_view_not_counted", profile=str(profile_id))
        return False
