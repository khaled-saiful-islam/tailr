"""What administrators see and do: who uses Tailr, how much AI they use, and the switches.

Disabling an account signs it out everywhere at once. Admins can't lock themselves
out: they can't disable, demote, or turn off AI for their own account.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import Select, and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiRun
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError
from app.modules.admin.schemas import (
    AdminUserDetail,
    AdminUserPage,
    AdminUserRow,
    AdminUserUpdate,
    DayUse,
    Overview,
    PurposeUse,
    SourceHealth,
)
from app.modules.auth.models import Role, Session, User
from app.modules.auth.repository import SessionRepository
from app.modules.brief.models import Match
from app.modules.kits.models import Kit
from app.modules.sources.models import SourceRun
from app.modules.tracker.models import Application

TOKENS = AiRun.prompt_tokens + AiRun.completion_tokens
PAGE_LIMIT = 100
DAYS = 14


def _since(days: float) -> datetime:
    return utcnow() - timedelta(days=days)


class AdminService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _purposes(self, *where: object) -> list[PurposeUse]:
        rows = await self.db.execute(
            select(AiRun.purpose, func.sum(TOKENS), func.count())
            .where(AiRun.created_at >= _since(30), *where)  # type: ignore[arg-type]
            .group_by(AiRun.purpose)
            .order_by(func.sum(TOKENS).desc())
            .limit(12)
        )
        return [PurposeUse(purpose=p, tokens=int(t or 0), calls=int(c)) for p, t, c in rows]

    async def _days(self, *where: object) -> list[DayUse]:
        day = func.date_trunc("day", AiRun.created_at)
        rows: dict[datetime, int] = dict(
            (
                await self.db.execute(
                    select(day, func.sum(TOKENS))
                    .where(AiRun.created_at >= _since(DAYS), *where)  # type: ignore[arg-type]
                    .group_by(day)
                )
            ).all()
        )
        by_date = {key.date(): int(value or 0) for key, value in rows.items()}
        today = utcnow().date()
        return [
            DayUse(day=d, tokens=by_date.get(d, 0))
            for d in (today - timedelta(days=offset) for offset in range(DAYS - 1, -1, -1))
        ]

    async def _sources(self) -> list[SourceHealth]:
        since = _since(1)
        rows = await self.db.execute(
            select(
                SourceRun.source,
                func.count(),
                func.sum(case((SourceRun.status == "failed", 1), else_=0)),
                func.sum(
                    case((and_(SourceRun.status == "ok", SourceRun.results == 0), 1), else_=0)
                ),
            )
            .where(SourceRun.created_at >= since, SourceRun.kind == "search")
            .group_by(SourceRun.source)
        )
        health = []
        for source, runs, failed, empty in rows:
            last_ok = await self.db.scalar(
                select(func.max(SourceRun.created_at)).where(
                    SourceRun.source == source, SourceRun.status == "ok", SourceRun.results > 0
                )
            )
            last_error = await self.db.scalar(
                select(SourceRun.error)
                .where(SourceRun.source == source, SourceRun.status == "failed")
                .order_by(SourceRun.created_at.desc())
                .limit(1)
            )
            health.append(
                SourceHealth(
                    source=source,
                    runs=int(runs),
                    failed=int(failed or 0),
                    empty=int(empty or 0),
                    last_ok_at=last_ok,
                    last_error=(last_error or None) and last_error[:300],
                )
            )
        return sorted(health, key=lambda item: item.source)

    async def _users(self, *where: object) -> int:
        return int(
            await self.db.scalar(select(func.count()).select_from(User).where(*where))  # type: ignore[arg-type]
            or 0
        )

    async def _tokens(self, days: float) -> int:
        return int(
            await self.db.scalar(
                select(func.coalesce(func.sum(TOKENS), 0)).where(AiRun.created_at >= _since(days))
            )
            or 0
        )

    async def _owned(self, model: type[Application | Kit | Match], user_id: uuid.UUID) -> int:
        return int(
            await self.db.scalar(
                select(func.count()).select_from(model).where(model.user_id == user_id)
            )
            or 0
        )

    async def overview(self) -> Overview:
        active = await self.db.scalar(
            select(func.count(func.distinct(Session.user_id))).where(
                Session.last_used_at >= _since(7)
            )
        )
        return Overview(
            users=await self._users(),
            active_7d=int(active or 0),
            new_7d=await self._users(User.created_at >= _since(7)),
            disabled=await self._users(User.is_active.is_(False)),
            tokens_24h=await self._tokens(1),
            tokens_30d=await self._tokens(30),
            calls_24h=int(
                await self.db.scalar(select(func.count()).where(AiRun.created_at >= _since(1))) or 0
            ),
            errors_24h=int(
                await self.db.scalar(
                    select(func.count()).where(AiRun.created_at >= _since(1), AiRun.status != "ok")
                )
                or 0
            ),
            default_budget=get_settings().ai_daily_budget_tokens,
            purposes_30d=await self._purposes(),
            days=await self._days(),
            sources=await self._sources(),
        )

    def _rows(self) -> Select[User, int, int]:
        day = (
            select(func.coalesce(func.sum(TOKENS), 0))
            .where(AiRun.user_id == User.id, AiRun.created_at >= _since(1))
            .scalar_subquery()
        )
        month = (
            select(func.coalesce(func.sum(TOKENS), 0))
            .where(AiRun.user_id == User.id, AiRun.created_at >= _since(30))
            .scalar_subquery()
        )
        return select(User, day.label("day"), month.label("month"))

    @staticmethod
    def _row(user: User, day: int, month: int) -> AdminUserRow:
        return AdminUserRow(
            **{field: getattr(user, field) for field in AdminUserRow.model_fields
               if field not in {"tokens_24h", "tokens_30d"}},
            tokens_24h=int(day or 0),
            tokens_30d=int(month or 0),
        )  # fmt: skip

    async def users(
        self, *, query: str | None, status: str | None, limit: int, offset: int
    ) -> AdminUserPage:
        stmt = self._rows()
        filters = []
        if query:
            like = f"%{query.strip().lower()}%"
            filters.append(
                or_(
                    func.lower(User.email).like(like),
                    func.lower(User.name).like(like),
                    func.lower(func.coalesce(User.username, "")).like(like),
                )
            )
        if status == "disabled":
            filters.append(User.is_active.is_(False))
        elif status == "ai_off":
            filters.append(User.ai_enabled.is_(False))
        elif status == "admins":
            filters.append(User.role == Role.ADMIN)
        total = await self.db.scalar(select(func.count()).select_from(User).where(*filters))
        rows = await self.db.execute(
            stmt.where(*filters)
            .order_by(func.coalesce(User.last_login_at, User.created_at).desc())
            .limit(min(limit, PAGE_LIMIT))
            .offset(offset)
        )
        return AdminUserPage(
            items=[self._row(user, day, month) for user, day, month in rows],
            total=int(total or 0),
        )

    async def user(self, user_id: uuid.UUID) -> AdminUserDetail:
        row = (await self.db.execute(self._rows().where(User.id == user_id))).first()
        if row is None:
            raise NotFoundError("We couldn't find that user.")
        user, day, month = row
        mine = AiRun.user_id == user.id
        calls, errors = (
            await self.db.execute(
                select(func.count(), func.sum(case((AiRun.status != "ok", 1), else_=0))).where(
                    mine, AiRun.created_at >= _since(30)
                )
            )
        ).one()
        devices = await self.db.scalar(
            select(func.count()).where(Session.user_id == user.id, Session.expires_at > utcnow())
        )
        return AdminUserDetail(
            **self._row(user, day, month).model_dump(),
            default_budget=get_settings().ai_daily_budget_tokens,
            calls_30d=int(calls or 0),
            errors_30d=int(errors or 0),
            signed_in_devices=int(devices or 0),
            purposes_30d=await self._purposes(mine),
            days=await self._days(mine),
            applications=await self._owned(Application, user.id),
            kits=await self._owned(Kit, user.id),
            matches=await self._owned(Match, user.id),
        )

    async def update(
        self, admin: User, user_id: uuid.UUID, data: AdminUserUpdate
    ) -> AdminUserDetail:
        user = await self.db.get(User, user_id)
        if user is None:
            raise NotFoundError("We couldn't find that user.")
        sent = data.model_fields_set
        if user.id == admin.id and (
            data.is_active is False or data.ai_enabled is False or data.role == Role.USER
        ):
            raise ConflictError(
                "You can't switch off or demote your own account.", code="own_account"
            )
        if user.is_demo and data.role == Role.ADMIN:
            raise ConflictError(
                "The demo account's password is public, so it can't be an administrator.",
                code="demo_account",
            )
        if "is_active" in sent and data.is_active is not None:
            user.is_active = data.is_active
            if not data.is_active:
                await SessionRepository(self.db).delete_for_user(user.id)
        if "ai_enabled" in sent and data.ai_enabled is not None:
            user.ai_enabled = data.ai_enabled
        if "ai_daily_budget" in sent:
            user.ai_daily_budget = data.ai_daily_budget
        if "role" in sent and data.role is not None:
            user.role = data.role
        await self.db.flush()
        return await self.user(user.id)
