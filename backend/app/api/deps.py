"""Request-scoped dependencies shared by every router."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import session_factory
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.modules.auth.models import Role, User
from app.modules.auth.service import AuthService


async def get_db() -> AsyncIterator[AsyncSession]:
    """One session per request: committed if the handler succeeds, rolled back if not."""
    async with session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


DbSession = Annotated[AsyncSession, Depends(get_db)]


def client_ip(request: Request) -> str:
    # Behind a proxy (nginx, Cloudflare) the first forwarded address is the client.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def session_token(request: Request) -> str | None:
    return request.cookies.get(get_settings().session_cookie_name)


async def current_user(request: Request, db: DbSession) -> User:
    token = session_token(request)
    if not token:
        raise AuthenticationError("Please sign in.")
    user = await AuthService(db).resolve(token)
    if user is None:
        raise AuthenticationError("Your session has ended. Please sign in again.")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def require_admin(user: CurrentUser) -> User:
    if user.role != Role.ADMIN:
        raise PermissionDeniedError("Only administrators can do that.", code="admin_only")
    return user


AdminUser = Annotated[User, Depends(require_admin)]
