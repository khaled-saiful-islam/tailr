"""Background work for the tracker."""

from __future__ import annotations

from app.core.logging import get_logger
from app.modules.tracker.nudges import send_due
from app.worker import broker

log = get_logger(__name__)


@broker.task(task_name="tracker.send_nudges", schedule=[{"cron": "*/15 * * * *"}])
async def send_nudges() -> int:
    sent = await send_due()
    if sent:
        log.info("tracker_nudges_sent", sent=sent)
    return sent
