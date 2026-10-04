"""Imports every table so Alembic and tests see the full schema."""

from __future__ import annotations

from app.ai.models import AiRun
from app.core.db import Base
from app.modules.auth.models import Session, User
from app.modules.profile.models import CvImport, Profile

__all__ = ["AiRun", "Base", "CvImport", "Profile", "Session", "User"]
