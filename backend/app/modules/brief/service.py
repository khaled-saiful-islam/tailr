"""Read briefs and matches; run a brief on demand; triage matches."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.errors import NotFoundError, UnprocessableError
from app.modules.auth.models import User
from app.modules.brief.builder import start_brief
from app.modules.brief.models import Brief, Match, MatchStatus
from app.modules.brief.schemas import (
    BriefOut,
    InsightsOut,
    JobSummaryOut,
    MatchDetailOut,
    MatchOut,
    MatchPage,
    RequirementOut,
    ReviewOut,
    TodayOut,
)
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.signals import has_skill, profile_signals
from app.modules.momentum.service import MomentumService
from app.modules.profile.service import ProfileService
from app.modules.radar.models import Radar
from app.modules.tracker.models import Application
from app.modules.tracker.service import TrackerService

RUNS_PER_DAY = 8
# Jobs stay on the Jobs page (and Home) this long after Tailr finds them. Jobs you saved,
# added yourself or put on My applications stay until you remove them. Old ones are only
# hidden, never deleted: a link to one still opens it.
JOBS_KEPT_DAYS = 14


def kept(user_id: uuid.UUID, now: datetime) -> ColumnElement[bool]:
    """Found in the last JOBS_KEPT_DAYS, or something the person chose to keep."""
    tracked = (
        select(Application.id)
        .where(Application.user_id == user_id, Application.job_id == Match.job_id)
        .exists()
    )
    return or_(
        Match.created_at >= now - timedelta(days=JOBS_KEPT_DAYS),
        Match.status == MatchStatus.SAVED,
        Match.origin == "pasted",
        tracked,
    )


def _match_out(match: Match, job: Job) -> MatchOut:
    return MatchOut(
        id=match.id,
        score=match.score,
        parts=match.parts or {},
        status=match.status,
        origin=match.origin,
        created_at=match.created_at,
        review=ReviewOut.model_validate(match.review or {}),
        job=JobSummaryOut.model_validate(job),
    )


class BriefService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _brief_out(self, brief: Brief) -> BriefOut:
        rows = (
            await self.db.execute(
                select(Match, Job)
                .join(Job, Job.id == Match.job_id)
                .where(
                    Match.brief_id == brief.id,
                    Match.status != MatchStatus.DISMISSED,
                    kept(brief.user_id, utcnow()),
                )
                .order_by(Match.score.desc())
            )
        ).all()
        return BriefOut(
            id=brief.id,
            status=brief.status,
            stage=brief.stage,
            trigger=brief.trigger,
            local_date=brief.local_date,
            created_at=brief.created_at,
            finished_at=brief.finished_at,
            stats=brief.stats or {},
            error=brief.error,
            matches=[_match_out(match, job) for match, job in rows],
        )

    async def today(self, user: User) -> TodayOut:
        brief = (
            await self.db.execute(
                select(Brief)
                .where(Brief.user_id == user.id)
                .order_by(Brief.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        radar = (
            await self.db.execute(select(Radar).where(Radar.user_id == user.id))
        ).scalar_one_or_none()
        document = await ProfileService(self.db).document_for(user.id)
        if radar is not None:
            await MomentumService(self.db).record_check(user)
        return TodayOut(
            brief=await self._brief_out(brief) if brief else None,
            next_brief_at=radar.next_brief_at if radar else None,
            radar_ready=radar is not None,
            profile_ready=document is not None and not document.is_empty,
        )

    async def run_now(self, user: User) -> BriefOut:
        radar = (
            await self.db.execute(select(Radar).where(Radar.user_id == user.id))
        ).scalar_one_or_none()
        if radar is None:
            raise UnprocessableError(
                "Set your job preferences first, so Tailr knows what to look for.", code="no_radar"
            )
        await rate_limit.enforce(
            f"brief-run:{user.id}",
            limit=RUNS_PER_DAY,
            window_seconds=24 * 3600,
            message="You've searched a lot today. Tailr searches again tomorrow morning.",
        )
        await self.db.commit()  # the builder reads in its own transactions
        brief_id = await start_brief(user.id, "manual")
        if brief_id is None:
            raise NotFoundError("We couldn't start the job search.")
        from app.modules.brief.tasks import build_brief

        await build_brief.kiq(str(brief_id))
        brief = await self.db.get(Brief, brief_id)
        if brief is None:
            raise NotFoundError("We couldn't find that job search.")
        await self.db.refresh(brief)
        return await self._brief_out(brief)

    async def get(self, user: User, brief_id: uuid.UUID) -> BriefOut:
        brief = await self.db.get(Brief, brief_id)
        if brief is None or brief.user_id != user.id:
            raise NotFoundError("We couldn't find that job search.")
        return await self._brief_out(brief)

    async def matches(
        self, user: User, *, status: MatchStatus | None, min_score: int, limit: int, offset: int
    ) -> MatchPage:
        base = (
            select(Match, Job)
            .join(Job, Job.id == Match.job_id)
            .where(Match.user_id == user.id, Match.score >= min_score)
        )
        # "Not interested" keeps every dismissed job; everything else follows the 14 days.
        keep = kept(user.id, utcnow())
        if status == MatchStatus.DISMISSED:
            base = base.where(Match.status == status)
        elif status is not None:
            base = base.where(Match.status == status, keep)
        else:
            base = base.where(Match.status != MatchStatus.DISMISSED, keep)
        total = await self.db.scalar(select(func.count()).select_from(base.subquery()))
        rows = (
            await self.db.execute(
                base.order_by(Match.created_at.desc(), Match.score.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()
        counts = dict(
            (
                await self.db.execute(
                    select(Match.status, func.count())
                    .where(
                        Match.user_id == user.id,
                        or_(Match.status == MatchStatus.DISMISSED, keep),
                    )
                    .group_by(Match.status)
                )
            ).all()
        )
        return MatchPage(
            items=[_match_out(match, job) for match, job in rows],
            total=int(total or 0),
            counts={str(key): int(value) for key, value in counts.items()},
            kept_days=JOBS_KEPT_DAYS,
        )

    async def _own_match(self, user: User, match_id: uuid.UUID) -> tuple[Match, Job]:
        row = (
            await self.db.execute(
                select(Match, Job)
                .join(Job, Job.id == Match.job_id)
                .where(Match.id == match_id, Match.user_id == user.id)
            )
        ).first()
        if row is None:
            raise NotFoundError("We couldn't find that job.")
        return row[0], row[1]

    async def match_detail(self, user: User, match_id: uuid.UUID) -> MatchDetailOut:
        match, job = await self._own_match(user, match_id)
        if match.status == MatchStatus.NEW:
            match.status = MatchStatus.SEEN
            match.seen_at = utcnow()
        base = _match_out(match, job)
        return MatchDetailOut(
            **base.model_dump(),
            description=job.description_text or job.snippet,
            insights=InsightsOut.model_validate(job.insights) if job.insights else None,
            requirements=await self._requirements(user, match, job),
            application=await TrackerService(self.db).ref_for_job(user.id, job.id),
        )

    async def _requirements(self, user: User, match: Match, job: Job) -> list[RequirementOut]:
        """Each must-have skill, marked by whether the profile shows it (or the AI saw it)."""
        if not job.insights:
            return []
        insights = JobInsights.model_validate(job.insights)
        document = await ProfileService(self.db).document_for(user.id)
        signals = profile_signals(document) if document else None
        seen_by_ai = [m.casefold() for m in (match.review or {}).get("matched", [])]

        def have(skill: str) -> bool:
            key = skill.casefold()
            if signals is not None and has_skill(signals, skill):
                return True
            return any(key in m or m in key for m in seen_by_ai)

        return [RequirementOut(skill=skill, have=have(skill)) for skill in insights.required_skills]

    async def update_match(self, user: User, match_id: uuid.UUID, status: str) -> MatchOut:
        match, job = await self._own_match(user, match_id)
        match.status = MatchStatus(status)
        match.status_changed_at = utcnow()
        if match.status == MatchStatus.SEEN and match.seen_at is None:
            match.seen_at = utcnow()
        tracker = TrackerService(self.db)
        if match.status == MatchStatus.SAVED:
            await tracker.track(user.id, job_id=job.id, match_id=match.id)
        else:
            await tracker.forget_saved(user.id, job.id)
        await self.db.flush()
        return _match_out(match, job)
