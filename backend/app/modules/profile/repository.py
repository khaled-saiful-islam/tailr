from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.profile.models import CvImport, Profile


class ProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def for_user(self, user_id: uuid.UUID, *, lock: bool = False) -> Profile | None:
        stmt = select(Profile).where(Profile.user_id == user_id)
        if lock:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def add(self, profile: Profile) -> Profile:
        self.db.add(profile)
        await self.db.flush()
        return profile


class ImportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add(self, item: CvImport) -> CvImport:
        self.db.add(item)
        await self.db.flush()
        return item

    async def get(self, import_id: uuid.UUID) -> CvImport | None:
        return await self.db.get(CvImport, import_id)

    async def get_for_user(self, import_id: uuid.UUID, user_id: uuid.UUID) -> CvImport | None:
        result = await self.db.execute(
            select(CvImport).where(CvImport.id == import_id, CvImport.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def latest_for_user(self, user_id: uuid.UUID) -> CvImport | None:
        result = await self.db.execute(
            select(CvImport)
            .where(CvImport.user_id == user_id)
            .order_by(CvImport.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
