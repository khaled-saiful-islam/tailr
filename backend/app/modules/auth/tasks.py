"""Housekeeping for accounts."""

from __future__ import annotations

from app.core.clock import utcnow
from app.core.db import session_scope
from app.core.logging import get_logger
from app.modules.auth.repository import SessionRepository
from app.worker import broker

log = get_logger(__name__)


@broker.task(task_name="auth.purge_expired_sessions", schedule=[{"cron": "17 3 * * *"}])
async def purge_expired_sessions() -> int:
    async with session_scope() as db:
        removed = await SessionRepository(db).delete_expired(utcnow())
    log.info("expired_sessions_purged", removed=removed)
    return removed
