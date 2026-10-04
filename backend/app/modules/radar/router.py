from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.modules.radar.schemas import (
    PreviewOut,
    PreviewRequest,
    RadarOptionsOut,
    RadarOut,
    RadarUpdate,
    SuggestionsOut,
)
from app.modules.radar.service import RadarService

router = APIRouter(prefix="/radar", tags=["radar"])


@router.get("", response_model=RadarOut)
async def get_radar(user: CurrentUser, db: DbSession) -> RadarOut:
    """Your radar, or sensible defaults from your profile before the first save."""
    return await RadarService(db).get(user)


@router.put("", response_model=RadarOut)
async def save_radar(data: RadarUpdate, user: CurrentUser, db: DbSession) -> RadarOut:
    return await RadarService(db).save(user, data)


@router.get("/options", response_model=RadarOptionsOut)
async def radar_options(user: CurrentUser) -> RadarOptionsOut:
    return RadarService.options()


@router.post("/suggest", response_model=SuggestionsOut)
async def suggest_roles(user: CurrentUser, db: DbSession) -> SuggestionsOut:
    return await RadarService(db).suggest(user)


@router.post("/preview", response_model=PreviewOut)
async def preview_radar(data: PreviewRequest, user: CurrentUser, db: DbSession) -> PreviewOut:
    """Run the searches now and show what this radar would catch (results cached for an hour)."""
    return await RadarService(db).preview(user, data.settings)
