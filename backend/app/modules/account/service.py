"""Your account as a whole: AI usage, a copy of everything, and deleting it all.

By design this module reads every table that belongs to a user, so an export is
complete and a deletion leaves nothing behind. Rows go by cascade when the user row
is deleted; stored files (pictures, imported CVs, preview images) are removed after.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import allowance, tokens_used_today
from app.ai.models import AiRun
from app.core.clock import utcnow
from app.core.db import Base
from app.core.errors import AuthenticationError, ConflictError, PermissionDeniedError
from app.core.security import verify_password
from app.modules.account.schemas import UsageOut
from app.modules.auth.models import Role, User
from app.modules.auth.service import check_password_attempts
from app.modules.brief.models import Brief, Match
from app.modules.cv.models import Cv
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.media.models import StoredImage
from app.modules.momentum.models import ActivityDay, Goal
from app.modules.notifications.models import Notification
from app.modules.profile.models import CvImport, Profile
from app.modules.public_profile.models import PortfolioMessage, PublicProfile
from app.modules.radar.models import Radar
from app.modules.tracker.models import Application, ApplicationEvent

# Never exported: secrets, internal bookkeeping, and large vectors.
SKIP = {"password_hash", "token_hash", "embedding", "embedded_version", "previous_content"}
NO_KEY = frozenset({"file_key"})
DEMO_LOCKED = "This is a shared demo account, so it can't be deleted."
NO_OG = frozenset({"og_key"})
USER_FIELDS = ("id", "email", "username", "name", "timezone", "theme", "palette", "email_digest",
               "created_at", "last_login_at")  # fmt: skip


def _row(obj: Base, *, skip: frozenset[str] = frozenset()) -> dict[str, Any]:
    return {
        column.key: getattr(obj, column.key)
        for column in obj.__table__.columns
        if column.key not in SKIP and column.key not in skip
    }


def _job(job: Job) -> dict[str, Any]:
    return {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "url": job.url,
        "source": job.source,
    }


class AccountService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def usage(self, user: User) -> UsageOut:
        enabled, budget = await allowance(user.id)
        since = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        calls = await self.db.scalar(
            select(func.count()).where(AiRun.user_id == user.id, AiRun.created_at >= since)
        )
        return UsageOut(
            ai_enabled=enabled,
            tokens_today=await tokens_used_today(user.id),
            daily_budget=budget,
            calls_today=int(calls or 0),
        )

    async def _all(self, model: type[Base], user_id: uuid.UUID) -> list[Any]:
        rows = await self.db.execute(
            select(model).where(model.user_id == user_id)  # type: ignore[attr-defined]
        )
        return list(rows.scalars().all())

    async def export(self, user: User) -> dict[str, Any]:
        """Everything Tailr holds about you, as plain JSON."""
        jobs = {
            job.id: job
            for job in (
                await self.db.execute(
                    select(Job).where(
                        Job.id.in_(select(Match.job_id).where(Match.user_id == user.id))
                        | Job.id.in_(
                            select(Application.job_id).where(Application.user_id == user.id)
                        )
                    )
                )
            ).scalars()
        }

        def with_job(row: Any, data: dict[str, Any]) -> dict[str, Any]:
            job = jobs.get(row.job_id)
            return {**data, "job": _job(job) if job else None}

        applications = await self._all(Application, user.id)
        events = (
            (
                await self.db.execute(
                    select(ApplicationEvent).where(
                        ApplicationEvent.application_id.in_([a.id for a in applications])
                    )
                )
            )
            .scalars()
            .all()
            if applications
            else []
        )
        images = await self._all(StoredImage, user.id)
        mine = select(PublicProfile.id).where(PublicProfile.user_id == user.id)
        messages = (
            (
                await self.db.execute(
                    select(PortfolioMessage).where(PortfolioMessage.profile_id.in_(mine))
                )
            )
            .scalars()
            .all()
        )
        usage = (
            await self.db.execute(
                select(
                    AiRun.purpose, AiRun.prompt_tokens, AiRun.completion_tokens, AiRun.created_at
                )
                .where(AiRun.user_id == user.id)
                .order_by(AiRun.created_at)
            )
        ).all()
        data = {
            "exported_at": utcnow(),
            "about": "Everything Tailr holds about you. Pictures are listed by address.",
            "account": {field: getattr(user, field) for field in USER_FIELDS},
            "profile": [_row(row) for row in await self._all(Profile, user.id)],
            "cv_imports": [_row(row, skip=NO_KEY) for row in await self._all(CvImport, user.id)],
            "radar": [_row(row) for row in await self._all(Radar, user.id)],
            "briefs": [_row(row) for row in await self._all(Brief, user.id)],
            "matches": [with_job(row, _row(row)) for row in await self._all(Match, user.id)],
            "kits": [with_job(row, _row(row)) for row in await self._all(Kit, user.id)],
            "cv": [_row(row, skip=NO_OG) for row in await self._all(Cv, user.id)],
            "portfolio": [_row(row, skip=NO_OG) for row in await self._all(PublicProfile, user.id)],
            "portfolio_messages": [_row(row) for row in messages],
            "pictures": [
                {"id": image.id, "purpose": image.purpose, "url": f"/api/v1/images/{image.id}.webp",
                 "created_at": image.created_at}
                for image in images
            ],
            "applications": [with_job(row, _row(row)) for row in applications],
            "application_events": [_row(row) for row in events],
            "goals": [_row(row) for row in await self._all(Goal, user.id)],
            "brief_days": [row.day for row in await self._all(ActivityDay, user.id)],
            "notifications": [_row(row) for row in await self._all(Notification, user.id)],
            "ai_usage": [
                {"purpose": purpose, "tokens": prompt + completion, "at": at}
                for purpose, prompt, completion, at in usage
            ],
        }  # fmt: skip
        return jsonable_encoder(data)

    async def delete(self, user: User, password: str) -> list[str]:
        """Delete the account and everything in it. Returns stored file keys to remove."""
        if user.is_demo:
            raise PermissionDeniedError(DEMO_LOCKED, code="demo_account")
        await check_password_attempts(user)
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("That password isn't right.", code="bad_credentials")
        if user.role == Role.ADMIN:
            admins = await self.db.scalar(
                select(func.count()).where(User.role == Role.ADMIN, User.is_active.is_(True))
            )
            if (admins or 0) <= 1:
                raise ConflictError(
                    "You're the only administrator. Make someone else an admin first.",
                    code="last_admin",
                )
        keys = [image.key for image in await self._all(StoredImage, user.id)]
        keys += [row.file_key for row in await self._all(CvImport, user.id)]
        keys += [
            row.og_key
            for model in (PublicProfile, Cv)
            for row in await self._all(model, user.id)
            if row.og_key
        ]
        await self.db.delete(user)
        await self.db.flush()
        return keys
