"""Start background work, and list everything that's running for a person.

The list also shows work that already had its own background pipeline (job searches,
prepared applications, CV reads and CV edits), so the app has one place that says
"working on it".
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.errors import NotFoundError, RateLimitedError
from app.modules.auth.models import User
from app.modules.background.models import ACTIVE, BackgroundTask, TaskStatus
from app.modules.background.schemas import TaskList, TaskOut
from app.modules.brief.models import Brief, BriefStatus
from app.modules.cv.models import Cv
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.profile.models import CvImport

MAX_RUNNING = 6
RECENT = timedelta(hours=1)
JUST_FINISHED = timedelta(minutes=15)

SEARCH_STAGE = {
    "searching": "Searching LinkedIn and JobStreet",
    "reading": "Reading each job ad",
    "measuring": "Comparing each job with your profile",
    "reviewing": "Explaining the best matches",
}
KIT_STAGE = {
    "reading": "Reading the job ad",
    "tailoring": "Writing your CV and cover letter",
    "checking": "Checking every line against your profile",
}
IMPORT_STAGE = {
    "queued": "Starting",
    "reading": "Reading the text",
    "understanding": "Understanding your experience",
}


def _out(task: BackgroundTask) -> TaskOut:
    return TaskOut.model_validate(task)


class BackgroundService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def start(
        self,
        user: User,
        kind: str,
        title: str,
        data: dict[str, Any] | None = None,
        *,
        link: str | None = None,
    ) -> TaskOut:
        """Queue the work and return at once. Asking twice for the same thing returns the first.

        `link` is where the result will show, when that's known up front, so a page can
        recognise its own running work (on any device) before it finishes.
        """
        data = data or {}
        same = (
            await self.db.execute(
                select(BackgroundTask).where(
                    BackgroundTask.user_id == user.id,
                    BackgroundTask.kind == kind,
                    BackgroundTask.status.in_(ACTIVE),
                    BackgroundTask.input == data,
                )
            )
        ).scalar_one_or_none()
        if same is not None:
            return _out(same)
        running = await self.db.scalar(
            select(func.count()).where(
                BackgroundTask.user_id == user.id, BackgroundTask.status.in_(ACTIVE)
            )
        )
        if (running or 0) >= MAX_RUNNING:
            raise RateLimitedError(
                "A few things are already running. Give them a moment to finish.",
                code="too_many_tasks",
            )
        task = BackgroundTask(user_id=user.id, kind=kind, title=title[:200], input=data, link=link)
        self.db.add(task)
        await self.db.flush()
        task_id = task.id
        await self.db.commit()  # the worker reads it in its own transaction
        from app.modules.background.tasks import run_task

        await run_task.kiq(str(task_id))
        fresh = await self.db.get(BackgroundTask, task_id)
        assert fresh is not None
        await self.db.refresh(fresh)
        return _out(fresh)

    async def get(self, user: User, task_id: uuid.UUID) -> TaskOut:
        task = await self.db.get(BackgroundTask, task_id)
        if task is None or task.user_id != user.id:
            raise NotFoundError("We couldn't find that.")
        return _out(task)

    async def latest(self, user: User, kind: str) -> TaskOut | None:
        """The most recent task of a kind: a page can pick up where it left off."""
        task = (
            await self.db.execute(
                select(BackgroundTask)
                .where(BackgroundTask.user_id == user.id, BackgroundTask.kind == kind)
                .order_by(BackgroundTask.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        return _out(task) if task else None

    async def overview(self, user: User) -> TaskList:
        now = utcnow()
        own = (
            (
                await self.db.execute(
                    select(BackgroundTask)
                    .where(
                        BackgroundTask.user_id == user.id,
                        or_(
                            BackgroundTask.status.in_(ACTIVE),
                            BackgroundTask.created_at >= now - RECENT,
                        ),
                    )
                    .order_by(BackgroundTask.created_at.desc())
                    .limit(15)
                )
            )
            .scalars()
            .all()
        )
        items = [_out(task) for task in own]
        items += await self._searches(user, now)
        items += await self._kits(user, now)
        items += await self._cv(user)
        items += await self._imports(user, now)
        items.sort(key=lambda item: item.created_at, reverse=True)
        return TaskList(
            items=items,
            running=sum(1 for item in items if item.status in ACTIVE),
        )

    async def _searches(self, user: User, now: Any) -> list[TaskOut]:
        rows = (
            await self.db.execute(
                select(Brief)
                .where(
                    Brief.user_id == user.id,
                    or_(
                        Brief.status == BriefStatus.BUILDING,
                        Brief.finished_at >= now - JUST_FINISHED,
                    ),
                )
                .order_by(Brief.created_at.desc())
                .limit(2)
            )
        ).scalars()
        out = []
        for brief in rows:
            stats = brief.stats or {}
            status = {
                BriefStatus.BUILDING: TaskStatus.RUNNING,
                BriefStatus.READY: TaskStatus.DONE,
            }.get(brief.status, TaskStatus.FAILED)
            title = {
                TaskStatus.RUNNING: "Searching for new jobs",
                TaskStatus.DONE: f"Found {stats.get('matches', 0)} new jobs",
            }.get(status, "Job search didn't finish")
            out.append(
                TaskOut(
                    id=brief.id,
                    kind="job.search",
                    status=status,
                    title=title,
                    stage=SEARCH_STAGE.get(brief.stage) if status == TaskStatus.RUNNING else None,
                    result={"new": stats.get("matches", 0), "good": stats.get("good", 0)},
                    link="/jobs",
                    error=brief.error,
                    created_at=brief.created_at,
                    finished_at=brief.finished_at,
                )
            )
        return out

    async def _kits(self, user: User, now: Any) -> list[TaskOut]:
        rows = (
            await self.db.execute(
                select(Kit, Job.title, Job.company)
                .join(Job, Job.id == Kit.job_id)
                .where(
                    Kit.user_id == user.id,
                    or_(Kit.status == "building", Kit.updated_at >= now - JUST_FINISHED),
                )
                .order_by(Kit.updated_at.desc())
                .limit(5)
            )
        ).all()
        status_of = {"building": TaskStatus.RUNNING, "ready": TaskStatus.DONE}
        return [
            TaskOut(
                id=kit.id,
                kind="application.prepare",
                status=status_of.get(kit.status, TaskStatus.FAILED),
                title=f"Your application for {title} at {company}",
                stage=KIT_STAGE.get(kit.stage) if kit.status == "building" else None,
                link=f"/apply/{kit.id}",
                error=kit.error,
                created_at=kit.updated_at,
                finished_at=None if kit.status == "building" else kit.updated_at,
            )
            for kit, title, company in rows
        ]

    async def _cv(self, user: User) -> list[TaskOut]:
        cv = (await self.db.execute(select(Cv).where(Cv.user_id == user.id))).scalar_one_or_none()
        if cv is None or cv.status != "working":
            return []
        return [
            TaskOut(
                id=cv.id,
                kind="cv.improve",
                status=TaskStatus.RUNNING,
                title="Improving your CV",
                stage="Rewriting, then checking every line",
                link="/profile/cv",
                created_at=cv.updated_at,
            )
        ]

    async def _imports(self, user: User, now: Any) -> list[TaskOut]:
        rows = (
            await self.db.execute(
                select(CvImport)
                .where(
                    CvImport.user_id == user.id,
                    or_(
                        CvImport.status.in_(list(IMPORT_STAGE)),
                        CvImport.updated_at >= now - JUST_FINISHED,
                    ),
                )
                .order_by(CvImport.created_at.desc())
                .limit(2)
            )
        ).scalars()
        out = []
        for item in rows:
            if item.status == "applied":
                continue
            running = item.status in IMPORT_STAGE
            status = (
                TaskStatus.RUNNING
                if running
                else TaskStatus.DONE
                if item.status == "ready"
                else TaskStatus.FAILED
            )
            out.append(
                TaskOut(
                    id=item.id,
                    kind="cv.read",
                    status=status,
                    title="Reading your CV" if running else "Your CV is read: check it",
                    stage=IMPORT_STAGE.get(item.status),
                    link=f"/profile/import/{item.id}",
                    error=item.error,
                    created_at=item.created_at,
                    finished_at=None if running else item.updated_at,
                )
            )
        return out
