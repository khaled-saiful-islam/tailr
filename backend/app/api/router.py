"""Mounts every module's router. New modules register here and nowhere else."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import system
from app.modules.auth.router import router as auth_router
from app.modules.brief.router import router as brief_router
from app.modules.cv.router import owner_router as cv_router
from app.modules.cv.router import public_router as public_cv_router
from app.modules.jobs.router import router as jobs_router
from app.modules.kits.router import router as kits_router
from app.modules.media.router import router as images_router
from app.modules.notifications.router import router as notifications_router
from app.modules.profile.router import router as profile_router
from app.modules.public_profile.router import owner_router as public_profile_router
from app.modules.public_profile.router import visitor_router as public_pages_router
from app.modules.radar.router import router as radar_router

api_router = APIRouter(prefix="/api")
api_router.include_router(system.router)

v1 = APIRouter(prefix="/v1")
v1.include_router(auth_router)
v1.include_router(profile_router)
v1.include_router(radar_router)
v1.include_router(brief_router)
v1.include_router(jobs_router)
v1.include_router(kits_router)
v1.include_router(notifications_router)
v1.include_router(images_router)
v1.include_router(public_profile_router)
v1.include_router(public_pages_router)
v1.include_router(cv_router)
v1.include_router(public_cv_router)

api_router.include_router(v1)
