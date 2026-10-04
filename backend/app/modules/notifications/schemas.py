from __future__ import annotations

import uuid
from datetime import datetime

from app.core.schemas import Schema


class NotificationOut(Schema):
    id: uuid.UUID
    kind: str
    title: str
    body: str | None
    link: str | None
    read: bool
    created_at: datetime


class NotificationPage(Schema):
    items: list[NotificationOut]
    unread: int
