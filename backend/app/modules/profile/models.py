from __future__ import annotations

import uuid
from enum import StrEnum
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin, TimestampMixin


class Profile(IdMixin, TimestampMixin, Base):
    """One per user. `document` is a validated `ProfileDocument` (JSONB)."""

    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    document: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    # Optimistic concurrency: a save must name the version it edited.
    version: Mapped[int] = mapped_column(Integer, default=1)
    strength: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(16), default="manual")
    # The profile as one vector (bge-m3) for matching, and which version it describes.
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    embedded_version: Mapped[int | None] = mapped_column(Integer)


class ImportStatus(StrEnum):
    QUEUED = "queued"
    READING = "reading"
    UNDERSTANDING = "understanding"
    READY = "ready"
    APPLIED = "applied"
    FAILED = "failed"


class CvImport(IdMixin, TimestampMixin, Base):
    """One uploaded CV and what the AI made of it."""

    __tablename__ = "cv_imports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    file_kind: Mapped[str] = mapped_column(String(16))
    file_key: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    status: Mapped[ImportStatus] = mapped_column(String(16), default=ImportStatus.QUEUED)
    error: Mapped[str | None] = mapped_column(Text)
    used_vision: Mapped[bool] = mapped_column(default=False)
    text_chars: Mapped[int] = mapped_column(Integer, default=0)
    draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
