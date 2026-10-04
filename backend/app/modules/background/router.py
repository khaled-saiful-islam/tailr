"""Background task routes: what's running, and one task's result."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.modules.background.schemas import TaskList, TaskOut
from app.modules.background.service import BackgroundService

router = APIRouter(prefix="/tasks", tags=["background tasks"])


@router.get("", response_model=TaskList)
async def tasks(user: CurrentUser, db: DbSession) -> TaskList:
    """Everything working for you now, and what finished in the last hour."""
    return await BackgroundService(db).overview(user)


@router.get("/latest/{kind}", response_model=TaskOut | None)
async def latest(kind: str, user: CurrentUser, db: DbSession) -> TaskOut | None:
    """The most recent task of a kind, so a page can show a result you left behind."""
    return await BackgroundService(db).latest(user, kind)


@router.get("/{task_id}", response_model=TaskOut)
async def task(task_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TaskOut:
    return await BackgroundService(db).get(user, task_id)
