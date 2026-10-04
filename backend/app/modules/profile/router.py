from __future__ import annotations

import uuid

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.errors import UnprocessableError
from app.modules.profile.schemas import (
    ApplyImportRequest,
    CoachBulletOut,
    CoachBulletRequest,
    ImportOut,
    ProfileOut,
    ProfileUpdate,
    SummaryOut,
    TextImportRequest,
)
from app.modules.profile.service import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(user: CurrentUser, db: DbSession) -> ProfileOut:
    return await ProfileService(db).get(user)


@router.put("", response_model=ProfileOut)
async def save_profile(data: ProfileUpdate, user: CurrentUser, db: DbSession) -> ProfileOut:
    return await ProfileService(db).save(user, data)


@router.post("/imports", response_model=ImportOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_cv(user: CurrentUser, db: DbSession, file: UploadFile = File(...)) -> ImportOut:
    limit = get_settings().upload_max_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise UnprocessableError(
            f"That file is larger than {get_settings().upload_max_mb} MB.", code="file_too_large"
        )
    return await ProfileService(db).start_import(user, data, file.filename or "cv")


@router.post("/imports/text", response_model=ImportOut, status_code=status.HTTP_202_ACCEPTED)
async def paste_cv(data: TextImportRequest, user: CurrentUser, db: DbSession) -> ImportOut:
    return await ProfileService(db).start_import(user, data.text.encode("utf-8"), "pasted-cv.txt")


@router.get("/imports/{import_id}", response_model=ImportOut)
async def get_import(import_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ImportOut:
    return await ProfileService(db).get_import(user, import_id)


@router.post("/imports/{import_id}/apply", response_model=ProfileOut)
async def apply_import(
    import_id: uuid.UUID, data: ApplyImportRequest, user: CurrentUser, db: DbSession
) -> ProfileOut:
    return await ProfileService(db).apply_import(user, import_id, data.mode)


@router.post("/coach/bullet", response_model=CoachBulletOut)
async def coach_bullet(
    data: CoachBulletRequest, user: CurrentUser, db: DbSession
) -> CoachBulletOut:
    return await ProfileService(db).coach_bullet(user, data)


@router.post("/coach/summary", response_model=SummaryOut)
async def write_summary(user: CurrentUser, db: DbSession) -> SummaryOut:
    return await ProfileService(db).write_summary(user)
