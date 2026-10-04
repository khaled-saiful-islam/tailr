"""Background work for background tasks: running them, and clearing old ones."""

from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy import delete

from app.core.clock import utcnow
from app.core.db import session_scope
from app.core.logging import get_logger
from app.modules.background.models import BackgroundTask
from app.modules.background.runner import run
from app.worker import broker

log = get_logger(__name__)
KEEP = timedelta(days=7)


@broker.task(task_name="background.run")
async def run_task(task_id: str) -> None:
    await run(uuid.UUID(task_id))


@broker.task(task_name="background.clear_old", schedule=[{"cron": "41 3 * * *"}])
async def clear_old() -> int:
    """Results are kept a week, long enough to come back to them."""
    async with session_scope() as db:
        result = await db.execute(
            delete(BackgroundTask).where(BackgroundTask.created_at < utcnow() - KEEP)
        )
    removed = result.rowcount or 0  # type: ignore[attr-defined]
    log.info("background_tasks_cleared", removed=removed)
    return int(removed)
