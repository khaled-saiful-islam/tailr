"""Tracker routes: the board, one application, moving and editing it, following up."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.modules.tracker.schemas import (
    ApplicationDetail,
    ApplicationOut,
    ApplicationUpdate,
    Board,
    TrackRequest,
)
from app.modules.tracker.service import TrackerService

router = APIRouter(prefix="/applications", tags=["tracker"])


@router.get("", response_model=Board)
async def board(user: CurrentUser, db: DbSession) -> Board:
    return await TrackerService(db).board(user)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def track(data: TrackRequest, user: CurrentUser, db: DbSession) -> ApplicationOut:
    """Put a job from your matches on the board (or move it forward to `stage`)."""
    return await TrackerService(db).add(user, data)


@router.get("/{application_id}", response_model=ApplicationDetail)
async def detail(application_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ApplicationDetail:
    return await TrackerService(db).detail(user, application_id)


@router.patch("/{application_id}", response_model=ApplicationOut)
async def update(
    application_id: uuid.UUID, data: ApplicationUpdate, user: CurrentUser, db: DbSession
) -> ApplicationOut:
    """Move (stage, position) or edit. Only the fields you send change; null clears one."""
    return await TrackerService(db).update(user, application_id, data)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove(application_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await TrackerService(db).remove(user, application_id)


@router.post("/{application_id}/follow-up/draft", response_model=ApplicationOut)
async def draft_follow_up(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationOut:
    """A short, truthful follow-up email, saved on the application."""
    return await TrackerService(db).draft(user, application_id)


@router.post("/{application_id}/follow-up/done", response_model=ApplicationOut)
async def followed_up(
    application_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ApplicationOut:
    return await TrackerService(db).followed_up(user, application_id)
