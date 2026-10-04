"""Mounts every module's router. New modules register here and nowhere else."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import system
from app.modules.auth.router import router as auth_router

api_router = APIRouter(prefix="/api")
api_router.include_router(system.router)

v1 = APIRouter(prefix="/v1")
v1.include_router(auth_router)

api_router.include_router(v1)
