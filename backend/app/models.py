"""Imports every table so Alembic and tests see the full schema."""

from __future__ import annotations

from app.ai.models import AiRun
from app.core.db import Base
from app.modules.auth.models import Session, User
from app.modules.profile.models import CvImport, Profile
from app.modules.radar.models import Radar
from app.modules.sources.models import SourceRun

__all__ = ["AiRun", "Base", "CvImport", "Profile", "Radar", "Session", "SourceRun", "User"]
