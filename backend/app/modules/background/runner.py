"""Runs one background task: marks it running, does the work, keeps the result, tells the user.

Each step commits on its own, so the task list shows progress while the work runs and a
crash still leaves an honest "failed" behind.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi.encoders import jsonable_encoder

from app.core.clock import utcnow
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.background.handlers import FAILED_TITLE, HANDLERS, Outcome
from app.modules.background.models import BackgroundTask, TaskStatus
from app.modules.notifications.service import notify

log = get_logger(__name__)
GENERIC_FAILURE = "Something went wrong. Please try again."


async def _update(task_id: uuid.UUID, **changes: Any) -> BackgroundTask | None:
    async with session_scope() as db:
        task = await db.get(BackgroundTask, task_id)
        if task is None:
            return None
        for key, value in changes.items():
            setattr(task, key, value)
        await db.flush()
        await db.refresh(task)
        db.expunge(task)
    await publish(task.user_id, "task", {"id": str(task.id), "status": task.status})
    return task


async def run(task_id: uuid.UUID) -> None:
    async with session_scope() as db:
        task = await db.get(BackgroundTask, task_id)
        if task is None or task.status != TaskStatus.QUEUED:
            return
        kind, user_id, data = task.kind, task.user_id, dict(task.input or {})
    await _update(task_id, status=TaskStatus.RUNNING)

    async def stage(text: str) -> None:
        await _update(task_id, stage=text[:160])

    try:
        handler = HANDLERS[kind]
        async with session_scope() as db:
            user = await db.get(User, user_id)
            if user is None or not user.is_active:
                raise AppError("This account can't run that any more.", code="inactive")
            outcome: Outcome = await handler(db, user, data, stage)
        done = await _update(
            task_id,
            status=TaskStatus.DONE,
            stage=None,
            result=jsonable_encoder(outcome.result),
            link=outcome.link,
            finished_at=utcnow(),
        )
        if done is not None and outcome.note:
            title, body = outcome.note
            await notify(user_id, kind=f"task.{kind}", title=title, body=body, link=outcome.link)
    except Exception as error:
        message = error.message if isinstance(error, AppError) else GENERIC_FAILURE
        if not isinstance(error, AppError):
            log.exception("background_task_failed", task=str(task_id), kind=kind)
        await _update(
            task_id, status=TaskStatus.FAILED, stage=None, error=message, finished_at=utcnow()
        )
        if kind in FAILED_TITLE:
            await notify(
                user_id, kind=f"task.{kind}.failed", title=FAILED_TITLE[kind], body=message
            )
