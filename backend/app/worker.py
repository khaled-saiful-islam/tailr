"""Background work: the taskiq broker and scheduler.

* `tailr-worker` runs `taskiq worker app.worker:broker app.tasks`
* `tailr-scheduler` runs `taskiq scheduler app.worker:scheduler app.tasks` (exactly one)

Tasks live next to the feature they serve (`app/modules/*/tasks.py`) and are
collected by `app/tasks.py`. Task state that matters (import progress, brief
status, kit steps) is stored in Postgres, so the broker needs no result backend.
"""

from __future__ import annotations

from typing import Any

from taskiq import AsyncBroker, InMemoryBroker, SmartRetryMiddleware, TaskiqEvents, TaskiqScheduler
from taskiq.schedule_sources import LabelScheduleSource
from taskiq_redis import RedisStreamBroker

from app.core.config import Environment, get_settings
from app.core.db import dispose_engine, init_engine
from app.core.logging import configure_logging, get_logger
from app.core.redis import close_redis

log = get_logger(__name__)


def _build_broker() -> AsyncBroker:
    settings = get_settings()
    if settings.app_env == Environment.TEST:
        # Tests run tasks inline; nothing touches Redis streams.
        return InMemoryBroker(await_inplace=True)
    return RedisStreamBroker(
        url=settings.redis_url, queue_name="tailr:tasks", consumer_group_name="tailr-workers"
    ).with_middlewares(
        SmartRetryMiddleware(
            default_retry_count=3, use_jitter=True, use_delay_exponent=True, max_delay_exponent=120
        )
    )


broker = _build_broker()
scheduler = TaskiqScheduler(broker, sources=[LabelScheduleSource(broker)])


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def _on_worker_startup(_: Any) -> None:
    from app import models as _models  # noqa: F401 - every table registered first

    settings = get_settings()
    configure_logging(settings)
    init_engine(settings.database_url)
    log.info("worker_started")


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def _on_worker_shutdown(_: Any) -> None:
    await close_redis()
    await dispose_engine()
