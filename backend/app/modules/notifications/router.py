from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.modules.notifications.schemas import NotificationPage
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationPage)
async def list_notifications(
    user: CurrentUser, db: DbSession, limit: int = Query(default=30, ge=1, le=200)
) -> NotificationPage:
    """Your latest notifications, newest first, with how many are unread."""
    return await NotificationService(db).page(user, limit)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(user: CurrentUser, db: DbSession) -> Response:
    await NotificationService(db).mark_all_read(user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    await NotificationService(db).mark_read(user, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
