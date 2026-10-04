"""Upload, serve and delete pictures. Processing runs off the event loop, with a time limit."""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.errors import NotFoundError, UnprocessableError
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.media.models import StoredImage
from app.modules.media.processing import process_image
from app.modules.media.schemas import ImageOut, ImagePurpose, image_url
from app.storage.files import get_storage

log = get_logger(__name__)

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
UPLOADS_PER_DAY = 100
PROCESS_TIMEOUT_SECONDS = 20


def _out(image: StoredImage) -> ImageOut:
    return ImageOut(
        id=image.id,
        purpose=image.purpose,
        url=image_url(image.id),
        width=image.width,
        height=image.height,
    )


class ImageService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upload(self, user: User, data: bytes, purpose: ImagePurpose) -> ImageOut:
        if len(data) > MAX_UPLOAD_BYTES:
            raise UnprocessableError("That picture is larger than 8 MB.", code="file_too_large")
        await rate_limit.enforce(
            f"images:{user.id}",
            limit=UPLOADS_PER_DAY,
            window_seconds=24 * 3600,
            message="That's a lot of pictures for one day. Try again tomorrow.",
        )
        try:
            processed = await asyncio.wait_for(
                asyncio.to_thread(process_image, data, purpose=purpose),
                timeout=PROCESS_TIMEOUT_SECONDS,
            )
        except TimeoutError as error:
            raise UnprocessableError(
                "That picture took too long to process. Try a smaller one.",
                code="image_too_large",
            ) from error
        key = await get_storage().save(processed.data, folder="images", suffix="webp")
        image = StoredImage(
            user_id=user.id,
            purpose=purpose,
            key=key,
            width=processed.width,
            height=processed.height,
            bytes=len(processed.data),
        )
        self.db.add(image)
        await self.db.flush()
        return _out(image)

    async def read(self, image_id: uuid.UUID) -> bytes:
        image = await self.db.get(StoredImage, image_id)
        if image is None:
            raise NotFoundError("Picture not found.")
        return await get_storage().read(image.key)

    async def delete(self, user: User, image_id: uuid.UUID) -> None:
        image = await self.db.get(StoredImage, image_id)
        if image is None or image.user_id != user.id:
            raise NotFoundError("Picture not found.")
        await self.db.delete(image)
        await self.db.flush()
        try:
            await get_storage().delete(image.key)
        except Exception:  # the row is gone; a stray file is harmless
            log.warning("image_file_delete_failed", image=str(image_id))

    async def owned(self, user: User, image_id: uuid.UUID) -> StoredImage | None:
        image = await self.db.get(StoredImage, image_id)
        return image if image is not None and image.user_id == user.id else None
