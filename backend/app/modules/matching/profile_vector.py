"""The profile as one vector, refreshed only when the profile changes."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.ai.client import get_ai
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import Profile
from app.modules.profile.service import profile_as_text

log = get_logger(__name__)


async def profile_vector(user_id: uuid.UUID) -> list[float] | None:
    async with session_scope() as db:
        profile = (
            await db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        if profile is None:
            return None
        if profile.embedding is not None and profile.embedded_version == profile.version:
            return list(profile.embedding)
        document = ProfileDocument.model_validate(profile.document)
        version = profile.version
    try:
        [vector] = await get_ai().embed(
            [profile_as_text(document)[:6000]], purpose="profile.embed", user_id=user_id
        )
    except AppError as error:
        log.info("profile_embed_failed", error=error.message)
        return None
    async with session_scope() as db:
        row = (
            await db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        if row is not None and row.version == version:
            row.embedding = vector
            row.embedded_version = version
    return vector
