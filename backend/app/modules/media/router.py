from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Response, UploadFile, status

from app.api.deps import CurrentUser, DbSession
from app.core.errors import UnprocessableError
from app.modules.media.schemas import ImageOut, ImagePurpose
from app.modules.media.service import MAX_UPLOAD_BYTES, ImageService

router = APIRouter(prefix="/images", tags=["images"])


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    purpose: Annotated[ImagePurpose, Form()],
) -> ImageOut:
    """Upload a JPG, PNG, WebP or GIF; it comes back as a cleaned, resized WebP."""
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise UnprocessableError("That picture is larger than 8 MB.", code="file_too_large")
    return await ImageService(db).upload(user, data, purpose)


@router.get("/{image_id}.webp", response_class=Response, include_in_schema=False)
async def serve_image(image_id: uuid.UUID, db: DbSession) -> Response:
    """Public by unguessable id, so a published page can show it; cached for a year."""
    data = await ImageService(db).read(image_id)
    return Response(
        content=data,
        media_type="image/webp",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(image_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    await ImageService(db).delete(user, image_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
