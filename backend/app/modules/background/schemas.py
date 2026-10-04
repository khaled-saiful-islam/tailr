"""Background task API contracts."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from app.core.schemas import Schema
from app.modules.background.models import TaskStatus


class TaskOut(Schema):
    """One piece of background work. `result` appears when it's done."""

    id: uuid.UUID
    kind: str
    status: TaskStatus
    title: str
    stage: str | None = None
    result: Any = None
    link: str | None = None
    error: str | None = None
    created_at: datetime
    finished_at: datetime | None = None


class TaskList(Schema):
    """What's running now and what finished in the last hour, newest first."""

    items: list[TaskOut]
    running: int
