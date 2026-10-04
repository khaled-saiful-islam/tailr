"""Momentum: the weekly goal, the brief-check streak, the funnel and the market pulse."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import local_today, utcnow, zone
from app.modules.auth.models import User
from app.modules.brief.models import Match
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.signals import has_skill, profile_signals
from app.modules.momentum.models import DEFAULT_WEEKLY_GOAL, ActivityDay, Goal
from app.modules.momentum.pulse import PulseJob, pulse
from app.modules.momentum.schemas import (
    CompanyOut,
    DayOut,
    FunnelOut,
    GoalOut,
    GoalUpdate,
    MomentumOut,
    PayOut,
    PulseOut,
    SkillOut,
    StreakOut,
)
from app.modules.momentum.streak import LOOKBACK_DAYS, streak, week
from app.modules.profile.service import ProfileService
from app.modules.radar.service import RadarService
from app.modules.tracker.service import TrackerService

PULSE_DAYS = 7
EVERY_DAY = (0, 1, 2, 3, 4, 5, 6)


def _start_of(day: date, timezone: str | None) -> datetime:
    return datetime.combine(day, time.min, tzinfo=zone(timezone)).astimezone(UTC)


class MomentumService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def record_check(self, user: User) -> None:
        """The user opened their brief today (their own today). Idempotent."""
        await self.db.execute(
            insert(ActivityDay)
            .values(user_id=user.id, day=local_today(user.timezone), checked_at=utcnow())
            .on_conflict_do_nothing()
        )

    async def _brief_days(self, user: User) -> tuple[int, ...]:
        settings = await RadarService(self.db).settings_for(user.id)
        if settings is None:
            return EVERY_DAY
        return () if settings.paused else tuple(settings.brief_days)

    async def _target(self, user: User) -> int:
        goal = await self.db.get(Goal, user.id)
        return goal.weekly_applications if goal else DEFAULT_WEEKLY_GOAL

    async def overview(self, user: User) -> MomentumOut:
        today = local_today(user.timezone)
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        done = await TrackerService(self.db).applied_between(
            user.id,
            _start_of(monday, user.timezone),
            _start_of(sunday + timedelta(days=1), user.timezone),
        )
        checked = set(
            (
                await self.db.execute(
                    select(ActivityDay.day).where(
                        ActivityDay.user_id == user.id,
                        ActivityDay.day >= today - timedelta(days=LOOKBACK_DAYS),
                    )
                )
            )
            .scalars()
            .all()
        )
        brief_days = await self._brief_days(user)
        current = streak(checked, today, brief_days)
        return MomentumOut(
            goal=GoalOut(
                target=await self._target(user),
                done=done,
                week_start=monday,
                week_end=sunday,
                days_left=(sunday - today).days + 1,
            ),
            streak=StreakOut(
                current=current.current,
                best=current.best,
                checked_today=current.checked_today,
                week=[
                    DayOut(day=day, state=state) for day, state in week(checked, today, brief_days)
                ],
            ),
            funnel=FunnelOut(**await TrackerService(self.db).funnel(user.id)),
        )

    async def set_goal(self, user: User, data: GoalUpdate) -> MomentumOut:
        await self.db.execute(
            insert(Goal)
            .values(user_id=user.id, weekly_applications=data.weekly_applications)
            .on_conflict_do_update(
                index_elements=[Goal.user_id],
                set_={"weekly_applications": data.weekly_applications, "updated_at": utcnow()},
            )
        )
        return await self.overview(user)

    async def pulse(self, user: User) -> PulseOut:
        since = utcnow() - timedelta(days=PULSE_DAYS)
        rows = (
            await self.db.execute(
                select(Job, Match.score)
                .join(Match, Match.job_id == Job.id)
                .where(Match.user_id == user.id, Match.created_at >= since)
            )
        ).all()
        jobs = []
        for job, score in rows:
            insights = JobInsights.model_validate(job.insights) if job.insights else None
            jobs.append(
                PulseJob(
                    company=job.company,
                    work_mode=job.work_mode or (insights.work_mode if insights else None),
                    salary_min=job.salary_min or (insights.salary_min if insights else None),
                    salary_max=job.salary_max or (insights.salary_max if insights else None),
                    skills=insights.required_skills if insights else [],
                    score=score,
                )
            )
        document = await ProfileService(self.db).document_for(user.id)
        signals = profile_signals(document) if document else None
        result = pulse(jobs, lambda skill: signals is not None and has_skill(signals, skill))
        start = local_today(user.timezone) - timedelta(days=PULSE_DAYS - 1)
        if result is None:
            return PulseOut(ready=False, since=start, jobs=len(jobs))
        settings = await RadarService(self.db).settings_for(user.id)
        return PulseOut(
            ready=True,
            since=start,
            jobs=result.jobs,
            good_fit=result.good_fit,
            skills=[SkillOut.model_validate(skill) for skill in result.skills],
            pay=PayOut.model_validate(result.pay) if result.pay else None,
            your_minimum=settings.salary_min if settings else None,
            modes=result.modes,
            companies=[CompanyOut(name=name, jobs=count) for name, count in result.companies],
        )
