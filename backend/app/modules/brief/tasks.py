"""Background work for briefs: build one, and start the ones that are due."""

from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy import select

from app.core.clock import utcnow
from app.core.db import session_scope
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.brief.builder import run_brief, start_brief
from app.modules.radar.models import Radar
from app.modules.radar.schedule import next_brief_at
from app.modules.radar.settings import RadarSettings
from app.worker import broker

log = get_logger(__name__)

DISPATCH_BATCH = 100


@broker.task(task_name="brief.build")
async def build_brief(brief_id: str) -> None:
    await run_brief(uuid.UUID(brief_id))


@broker.task(task_name="brief.dispatch_due", schedule=[{"cron": "*/5 * * * *"}])
async def dispatch_due() -> int:
    """Start every brief whose time has come. Safe with several workers (rows are locked)."""
    now = utcnow()
    due: list[uuid.UUID] = []
    async with session_scope() as db:
        rows = (
            await db.execute(
                select(Radar, User)
                .join(User, User.id == Radar.user_id)
                .where(Radar.next_brief_at.is_not(None), Radar.next_brief_at <= now)
                .with_for_update(of=Radar, skip_locked=True)
                .limit(DISPATCH_BATCH)
            )
        ).all()
        for radar, user in rows:
            settings = RadarSettings.model_validate(radar.settings)
            # Move the clock first, so a slow brief can never be dispatched twice.
            radar.next_brief_at = next_brief_at(settings, user.timezone, now + timedelta(minutes=1))
            if user.is_active:
                due.append(user.id)
    started = 0
    for user_id in due:
        brief_id = await start_brief(user_id, "scheduled")
        if brief_id:
            await build_brief.kiq(str(brief_id))
            started += 1
    if started:
        log.info("briefs_dispatched", count=started)
    return started
