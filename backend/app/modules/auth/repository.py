from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import Session, User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_identifier(self, identifier: str) -> User | None:
        """Find a user by email or username (case-insensitive)."""
        value = identifier.strip().lower()
        result = await self.db.execute(
            select(User).where(or_(User.email == value, User.username == value))
        )
        return result.scalar_one_or_none()

    async def add(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def delete(self, user: User) -> None:
        await self.db.delete(user)
        await self.db.flush()


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add(self, session: Session) -> Session:
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_active(self, token_hash: str, now: datetime) -> Session | None:
        result = await self.db.execute(
            select(Session).where(Session.token_hash == token_hash, Session.expires_at > now)
        )
        return result.scalar_one_or_none()

    async def delete_by_hash(self, token_hash: str) -> None:
        await self.db.execute(delete(Session).where(Session.token_hash == token_hash))

    async def delete_for_user(self, user_id: uuid.UUID, *, keep_hash: str | None = None) -> None:
        stmt = delete(Session).where(Session.user_id == user_id)
        if keep_hash:
            stmt = stmt.where(Session.token_hash != keep_hash)
        await self.db.execute(stmt)

    async def delete_expired(self, now: datetime) -> int:
        result = await self.db.execute(delete(Session).where(Session.expires_at <= now))
        return result.rowcount or 0  # type: ignore[attr-defined]
