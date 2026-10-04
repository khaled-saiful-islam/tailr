"""Imports every table so Alembic and tests see the full schema."""

from __future__ import annotations

from app.core.db import Base
from app.modules.auth.models import Session, User

__all__ = ["Base", "Session", "User"]
