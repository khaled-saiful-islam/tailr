from __future__ import annotations

import uuid
from typing import Literal

from app.core.schemas import Schema

ImagePurpose = Literal["avatar", "project"]


class ImageOut(Schema):
    id: uuid.UUID
    purpose: ImagePurpose
    url: str
    width: int
    height: int


def image_url(image_id: uuid.UUID) -> str:
    return f"/api/v1/images/{image_id}.webp"
