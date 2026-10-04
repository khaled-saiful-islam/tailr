"""Create notifications from background work; list and mark them read for the user."""

from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.db import session_scope
from app.core.errors import NotFoundError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationOut, NotificationPage

log = get_logger(__name__)

KEEP_PER_USER = 100


def _out(note: Notification) -> NotificationOut:
    return NotificationOut(
        id=note.id,
        kind=note.kind,
        title=note.title,
        body=note.body,
        link=note.link,
        read=note.read_at is not None,
        created_at=note.created_at,
    )


async def notify(
    user_id: uuid.UUID,
    *,
    kind: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> None:
    """Save a notification and announce it live. Never fails the work that called it."""
    try:
        async with session_scope() as db:
            note = Notification(
                user_id=user_id,
                kind=kind,
                title=title[:200],
                body=body and body[:500],
                link=link,
                created_at=utcnow(),  # not now(): that's frozen for a whole transaction
            )
            db.add(note)
            await db.flush()
            await db.refresh(note)
            payload = _out(note).model_dump(mode="json")
            newest = (
                select(Notification.id)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
                .limit(KEEP_PER_USER)
            )
            await db.execute(
                delete(Notification).where(
                    Notification.user_id == user_id, Notification.id.not_in(newest)
                )
            )
        await publish(user_id, "notification", payload)
    except Exception:
        log.exception("notify_failed", kind=kind)


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def page(self, user: User, limit: int) -> NotificationPage:
        rows = (
            await self.db.execute(
                select(Notification)
                .where(Notification.user_id == user.id)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
                .limit(limit)
            )
        ).scalars()
        unread = await self.db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        )
        return NotificationPage(items=[_out(note) for note in rows], unread=unread or 0)

    async def mark_read(self, user: User, notification_id: uuid.UUID) -> None:
        note = await self.db.get(Notification, notification_id)
        if note is None or note.user_id != user.id:
            raise NotFoundError("We couldn't find that notification.")
        if note.read_at is None:
            note.read_at = utcnow()

    async def mark_all_read(self, user: User) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
            .values(read_at=utcnow())
        )
