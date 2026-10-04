"""Imports every table so Alembic and tests see the full schema."""

from __future__ import annotations

from app.ai.models import AiRun
from app.core.db import Base
from app.modules.auth.models import Session, User
from app.modules.brief.models import Brief, Match
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.notifications.models import Notification
from app.modules.profile.models import CvImport, Profile
from app.modules.radar.models import Radar
from app.modules.sources.models import SourceRun

__all__ = [
    "AiRun",
    "Base",
    "Brief",
    "CvImport",
    "Job",
    "Kit",
    "Match",
    "Notification",
    "Profile",
    "Radar",
    "Session",
    "SourceRun",
    "User",
]
