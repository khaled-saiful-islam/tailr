"""Accounts and sessions."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import DEFAULT_TIMEZONE, is_valid_timezone, utcnow
from app.core.config import get_settings
from app.core.errors import AuthenticationError, ConflictError
from app.core.security import (
    hash_password,
    hash_token,
    needs_rehash,
    new_session_token,
    verify_password,
)
from app.modules.auth.models import Session, User
from app.modules.auth.repository import SessionRepository, UserRepository
from app.modules.auth.schemas import RegisterRequest, UpdateMeRequest

LOGIN_ATTEMPTS_PER_WINDOW = 10
LOGIN_WINDOW_SECONDS = 15 * 60
# Touch `last_used_at` at most this often, so reads do not write on every request.
SESSION_TOUCH_INTERVAL = timedelta(hours=1)


@dataclass(frozen=True)
class IssuedSession:
    user: User
    token: str
    max_age_seconds: int


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.sessions = SessionRepository(db)

    async def register(self, data: RegisterRequest) -> User:
        email = data.email.lower()
        if await self.users.get_by_email(email):
            raise ConflictError("An account with this email already exists.", code="email_taken")
        timezone = data.timezone if data.timezone and is_valid_timezone(data.timezone) else None
        user = User(
            email=email,
            name=data.name,
            password_hash=hash_password(data.password),
            timezone=timezone or DEFAULT_TIMEZONE,
        )
        return await self.users.add(user)

    async def authenticate(self, identifier: str, password: str, *, client_ip: str) -> User:
        key = f"login:{client_ip}:{identifier.strip().lower()}"
        await rate_limit.enforce(
            key,
            limit=LOGIN_ATTEMPTS_PER_WINDOW,
            window_seconds=LOGIN_WINDOW_SECONDS,
            message="Too many sign-in attempts. Try again in a few minutes.",
        )
        user = await self.users.get_by_identifier(identifier)
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            raise AuthenticationError(
                "That email, username or password is incorrect.", code="bad_credentials"
            )
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        user.last_login_at = utcnow()
        await rate_limit.reset(key)
        return user

    async def start_session(
        self, user: User, *, user_agent: str | None, ip_address: str | None
    ) -> IssuedSession:
        ttl = timedelta(days=get_settings().session_ttl_days)
        now = utcnow()
        token = new_session_token()
        await self.sessions.add(
            Session(
                user_id=user.id,
                token_hash=hash_token(token),
                created_at=now,
                last_used_at=now,
                expires_at=now + ttl,
                user_agent=(user_agent or "")[:300] or None,
                ip_address=ip_address,
            )
        )
        return IssuedSession(user=user, token=token, max_age_seconds=int(ttl.total_seconds()))

    async def resolve(self, token: str) -> User | None:
        now = utcnow()
        session = await self.sessions.get_active(hash_token(token), now)
        if session is None:
            return None
        user = await self.users.get(session.user_id)
        if user is None or not user.is_active:
            return None
        if now - session.last_used_at > SESSION_TOUCH_INTERVAL:
            session.last_used_at = now
        return user

    async def end_session(self, token: str) -> None:
        await self.sessions.delete_by_hash(hash_token(token))

    async def update_me(self, user: User, data: UpdateMeRequest) -> User:
        for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(user, field, value)
        await self.db.flush()
        return user

    async def change_password(
        self, user: User, current: str, new: str, *, keep_token: str | None
    ) -> None:
        if not verify_password(current, user.password_hash):
            raise AuthenticationError("Your current password is incorrect.", code="bad_credentials")
        user.password_hash = hash_password(new)
        # Sign out every other device; the current one stays signed in.
        await self.sessions.delete_for_user(
            user.id, keep_hash=hash_token(keep_token) if keep_token else None
        )

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.users.get(user_id)
