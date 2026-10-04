"""Pictures people upload for their public page: a profile photo and project images."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class StoredImage(IdMixin, TimestampMixin, Base):
    __tablename__ = "images"
    __table_args__ = (Index("ix_images_user", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    purpose: Mapped[str] = mapped_column(String(16))  # "avatar" | "project"
    key: Mapped[str] = mapped_column(String(200))  # storage key of the WebP
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    bytes: Mapped[int] = mapped_column(Integer)
