"""Admin routes. Every one needs an administrator."""

from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, DbSession
from app.modules.admin.schemas import AdminUserDetail, AdminUserPage, AdminUserUpdate, Overview
from app.modules.admin.service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=Overview)
async def overview(admin: AdminUser, db: DbSession) -> Overview:
    return await AdminService(db).overview()


@router.get("/users", response_model=AdminUserPage)
async def users(
    admin: AdminUser,
    db: DbSession,
    q: str | None = Query(default=None, max_length=120),
    status: Literal["all", "disabled", "ai_off", "admins"] = "all",
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminUserPage:
    return await AdminService(db).users(query=q, status=status, limit=limit, offset=offset)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def user(user_id: uuid.UUID, admin: AdminUser, db: DbSession) -> AdminUserDetail:
    return await AdminService(db).user(user_id)


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: uuid.UUID, data: AdminUserUpdate, admin: AdminUser, db: DbSession
) -> AdminUserDetail:
    """Disable or re-enable the account, switch AI, set a daily budget, or change role."""
    return await AdminService(db).update(admin, user_id, data)
