from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.modules.background.schemas import TaskOut
from app.modules.background.service import BackgroundService
from app.modules.profile.service import ProfileService
from app.modules.radar.schemas import (
    PreviewRequest,
    RadarOptionsOut,
    RadarOut,
    RadarUpdate,
)
from app.modules.radar.service import RadarService, check_preview

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


@router.post("/suggest", response_model=TaskOut, status_code=status.HTTP_202_ACCEPTED)
async def suggest_roles(user: CurrentUser, db: DbSession) -> TaskOut:
    """Suggest job titles and searches from your CV, in the background."""
    await ProfileService(db).require_experience(
        user.id, "Add your experience to your profile first, so suggestions fit you."
    )
    return await BackgroundService(db).start(
        user, "preferences.suggest", "Suggesting job titles from your CV"
    )


@router.post("/preview", response_model=TaskOut, status_code=status.HTTP_202_ACCEPTED)
async def preview_radar(data: PreviewRequest, user: CurrentUser, db: DbSession) -> TaskOut:
    """A quick look at what these preferences would find, searched in the background."""
    check_preview(data.settings)
    return await BackgroundService(db).start(
        user,
        "preferences.preview",
        "A quick look at LinkedIn and JobStreet",
        {"settings": data.settings.model_dump(mode="json")},
    )
