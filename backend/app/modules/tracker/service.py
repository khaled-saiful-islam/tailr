"""The tracker: where each application stands, and what happened to it.

Other modules put jobs on the board (saving a job, building a kit); the user moves
them along. Moving to Applied starts the follow-up clock.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.errors import NotFoundError
from app.modules.auth.models import User
from app.modules.brief.models import Match, MatchStatus
from app.modules.brief.schemas import JobSummaryOut
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.kits.schemas import CoverLetter
from app.modules.profile.service import ProfileService
from app.modules.tracker.followup import FollowUpFacts, draft_follow_up
from app.modules.tracker.models import (
    PATH,
    Application,
    ApplicationEvent,
    EventKind,
    Stage,
    step,
)
from app.modules.tracker.schemas import (
    ApplicationDetail,
    ApplicationOut,
    ApplicationRef,
    ApplicationUpdate,
    Board,
    EventOut,
    FollowUpDraft,
    TrackRequest,
)

FOLLOW_UP_AFTER = timedelta(days=7)
BOARD_LIMIT = 500
DRAFTS_PER_DAY = 20

_Row = tuple[Application, Job, int | None, str | None]


def _out(app: Application, job: Job, score: int | None, kit_status: str | None) -> ApplicationOut:
    return ApplicationOut(
        id=app.id,
        stage=app.stage,
        position=app.position,
        stage_changed_at=app.stage_changed_at,
        created_at=app.created_at,
        notes=app.notes,
        applied_at=app.applied_at,
        next_step=app.next_step,
        next_step_at=app.next_step_at,
        contact_name=app.contact_name,
        contact_email=app.contact_email,
        follow_up_due_at=app.follow_up_due_at,
        nudged_at=app.nudged_at,
        followed_up_at=app.followed_up_at,
        follow_up_draft=FollowUpDraft.model_validate(app.follow_up_draft)
        if app.follow_up_draft
        else None,
        match_id=app.match_id,
        score=score,
        kit_id=app.kit_id,
        kit_status=kit_status,
        job=JobSummaryOut.model_validate(job),
    )


class TrackerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _rows() -> Select[Application, Job, int, str]:
        return (
            select(Application, Job, Match.score, Kit.status)
            .join(Job, Job.id == Application.job_id)
            .outerjoin(Match, Match.id == Application.match_id)
            .outerjoin(Kit, Kit.id == Application.kit_id)
        )

    async def _row(self, user: User, app_id: uuid.UUID) -> _Row:
        row = (
            await self.db.execute(
                self._rows().where(Application.id == app_id, Application.user_id == user.id)
            )
        ).first()
        if row is None:
            raise NotFoundError("We couldn't find that application.")
        return row[0], row[1], row[2], row[3]

    async def _event(
        self,
        app: Application,
        kind: EventKind,
        *,
        stage: Stage | None = None,
        detail: dict[str, str] | None = None,
    ) -> None:
        self.db.add(
            ApplicationEvent(
                application_id=app.id, kind=kind, stage=stage, detail=detail or {}, at=utcnow()
            )
        )

    async def _top_of(self, user_id: uuid.UUID, stage: Stage) -> float:
        lowest = await self.db.scalar(
            select(func.min(Application.position)).where(
                Application.user_id == user_id, Application.stage == stage
            )
        )
        return (lowest if lowest is not None else 1.0) - 1.0

    async def _move(self, app: Application, stage: Stage, position: float | None = None) -> None:
        now = utcnow()
        app.position = position if position is not None else await self._top_of(app.user_id, stage)
        app.stage = stage
        app.stage_changed_at = now
        app.furthest = max(app.furthest, step(stage))
        if step(stage) >= step(Stage.APPLIED) and app.applied_at is None:
            app.applied_at = now
            app.follow_up_due_at = now + FOLLOW_UP_AFTER
        await self._event(app, EventKind.STAGE, stage=stage)

    # Other modules ---------------------------------------------------------

    async def track(
        self,
        user_id: uuid.UUID,
        *,
        job_id: uuid.UUID,
        match_id: uuid.UUID | None = None,
        kit_id: uuid.UUID | None = None,
        stage: Stage = Stage.SAVED,
    ) -> Application:
        """Put a job on the board, or move it forward to `stage`. Never moves it back.

        Saving a job and building its kit can race; the unique row decides who adds it.
        """
        app = await self._find(user_id, job_id)
        if app is None:
            now = utcnow()
            applied = now if step(stage) >= step(Stage.APPLIED) else None
            new_id = await self.db.scalar(
                pg_insert(Application)
                .values(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    job_id=job_id,
                    match_id=match_id,
                    kit_id=kit_id,
                    stage=stage,
                    furthest=max(step(stage), 0),
                    position=await self._top_of(user_id, stage),
                    stage_changed_at=now,
                    applied_at=applied,
                    follow_up_due_at=applied + FOLLOW_UP_AFTER if applied else None,
                )
                .on_conflict_do_nothing(constraint="uq_applications_user_job")
                .returning(Application.id)
            )
            if new_id is not None:
                added = await self.db.get(Application, new_id)
                assert added is not None
                await self._event(added, EventKind.ADDED, stage=stage)
                await self.db.flush()
                return added
            app = await self._find(user_id, job_id)
            assert app is not None  # the other request added it
        app.match_id = app.match_id or match_id
        app.kit_id = kit_id or app.kit_id
        if app.stage != Stage.REJECTED and step(stage) > step(app.stage):
            await self._move(app, stage)
        await self.db.flush()
        return app

    async def _find(self, user_id: uuid.UUID, job_id: uuid.UUID) -> Application | None:
        return (
            await self.db.execute(
                select(Application).where(
                    Application.user_id == user_id, Application.job_id == job_id
                )
            )
        ).scalar_one_or_none()

    async def forget_saved(self, user_id: uuid.UUID, job_id: uuid.UUID) -> None:
        """Un-saving or skipping a job takes it off the board, if nothing happened to it yet."""
        app = await self._find(user_id, job_id)
        untouched = (
            app is not None
            and app.stage == Stage.SAVED
            and app.kit_id is None
            and not app.notes
            and app.next_step is None
        )
        if untouched:
            await self.db.delete(app)
            await self.db.flush()

    async def ref_for_job(self, user_id: uuid.UUID, job_id: uuid.UUID) -> ApplicationRef | None:
        app = await self._find(user_id, job_id)
        return ApplicationRef.model_validate(app) if app else None

    async def funnel(self, user_id: uuid.UUID) -> dict[str, int]:
        """How many applications ever reached each stage, and how many were turned down."""
        rows = (
            await self.db.execute(
                select(Application.furthest, Application.stage).where(
                    Application.user_id == user_id
                )
            )
        ).all()
        counts = {stage.value: 0 for stage in PATH}
        for furthest, _ in rows:
            for index, stage in enumerate(PATH):
                if furthest >= index:
                    counts[stage.value] += 1
        counts[Stage.REJECTED.value] = sum(1 for _, stage in rows if stage == Stage.REJECTED)
        return counts

    async def applied_between(self, user_id: uuid.UUID, start: datetime, end: datetime) -> int:
        return int(
            await self.db.scalar(
                select(func.count()).where(
                    Application.user_id == user_id,
                    Application.applied_at >= start,
                    Application.applied_at < end,
                )
            )
            or 0
        )

    # The board ---------------------------------------------------------------

    async def board(self, user: User) -> Board:
        rows = (
            await self.db.execute(
                self._rows()
                .where(Application.user_id == user.id)
                .order_by(Application.stage_changed_at.desc())
                .limit(BOARD_LIMIT)
            )
        ).all()
        items = sorted(
            (_out(app, job, score, kit) for app, job, score, kit in rows),
            key=lambda item: item.position,
        )
        counts = {stage.value: 0 for stage in Stage}
        for item in items:
            counts[item.stage.value] += 1
        return Board(items=items, counts=counts)

    async def detail(self, user: User, app_id: uuid.UUID) -> ApplicationDetail:
        app, job, score, kit = await self._row(user, app_id)
        events = (
            (
                await self.db.execute(
                    select(ApplicationEvent)
                    .where(ApplicationEvent.application_id == app.id)
                    .order_by(ApplicationEvent.at.desc())
                    .limit(100)
                )
            )
            .scalars()
            .all()
        )
        return ApplicationDetail(
            **_out(app, job, score, kit).model_dump(),
            events=[EventOut.model_validate(event) for event in events],
        )

    async def add(self, user: User, data: TrackRequest) -> ApplicationOut:
        match = await self.db.get(Match, data.match_id)
        if match is None or match.user_id != user.id:
            raise NotFoundError("We couldn't find that job.")
        if match.status in {MatchStatus.NEW, MatchStatus.SEEN, MatchStatus.DISMISSED}:
            match.status = MatchStatus.SAVED
            match.status_changed_at = utcnow()
        kit_id = await self.db.scalar(
            select(Kit.id).where(Kit.user_id == user.id, Kit.job_id == match.job_id)
        )
        app = await self.track(
            user.id, job_id=match.job_id, match_id=match.id, kit_id=kit_id, stage=data.stage
        )
        app, job, score, kit = await self._row(user, app.id)
        return _out(app, job, score, kit)

    async def update(
        self, user: User, app_id: uuid.UUID, data: ApplicationUpdate
    ) -> ApplicationOut:
        app, job, score, kit = await self._row(user, app_id)
        sent = data.model_fields_set
        if data.stage is not None and data.stage != app.stage:
            await self._move(app, data.stage, data.position)
        elif data.position is not None:
            app.position = data.position
        if "notes" in sent:
            app.notes = data.notes
        if "applied_at" in sent and data.applied_at is not None:
            app.applied_at = data.applied_at
            if app.followed_up_at is None and app.nudged_at is None:
                app.follow_up_due_at = data.applied_at + FOLLOW_UP_AFTER
        if "next_step" in sent or "next_step_at" in sent:
            # Compare only what was sent: a label fix mustn't re-send a reminder.
            new_step = data.next_step if "next_step" in sent else app.next_step
            new_at = data.next_step_at if "next_step_at" in sent else app.next_step_at
            if new_at != app.next_step_at:
                app.reminded_at = None
            if (new_step, new_at) != (app.next_step, app.next_step_at) and new_step:
                await self._event(app, EventKind.NEXT_STEP, detail={"text": new_step})
            app.next_step, app.next_step_at = new_step, new_at
        if "contact_name" in sent:
            app.contact_name = data.contact_name
        if "contact_email" in sent:
            app.contact_email = str(data.contact_email) if data.contact_email else None
        await self.db.flush()
        await self.db.refresh(app)
        return _out(app, job, score, kit)

    async def remove(self, user: User, app_id: uuid.UUID) -> None:
        app, *_ = await self._row(user, app_id)
        if app.match_id:
            match = await self.db.get(Match, app.match_id)
            if match is not None and match.status == MatchStatus.SAVED:
                match.status = MatchStatus.SEEN
                match.status_changed_at = utcnow()
        await self.db.delete(app)
        await self.db.flush()

    # Following up ------------------------------------------------------------------

    async def _source(self, user: User, app: Application) -> tuple[str, str, str]:
        """The applicant's name, the text a fit line may draw on, and the language."""
        document = await ProfileService(self.db).document_for(user.id)
        name = (document.basics.full_name if document else None) or user.name
        kit = await self.db.get(Kit, app.kit_id) if app.kit_id else None
        if kit is not None and kit.status == "ready" and kit.cover_letter:
            letter = CoverLetter.model_validate(kit.cover_letter)
            return name, "\n".join(letter.paragraphs), kit.language
        parts = []
        if document:
            parts = [document.basics.headline or "", document.basics.summary or ""]
        return name, "\n".join(part for part in parts if part), "en"

    async def draft(self, user: User, app_id: uuid.UUID) -> ApplicationOut:
        app, job, score, kit = await self._row(user, app_id)
        await rate_limit.enforce(
            f"follow-up:{user.id}",
            limit=DRAFTS_PER_DAY,
            window_seconds=24 * 3600,
            message="You've drafted a lot of follow-ups today. Try again tomorrow.",
        )
        name, source, language = await self._source(user, app)
        subject, body = await draft_follow_up(
            FollowUpFacts(
                applicant=name,
                title=job.title,
                company=job.company,
                applied_on=app.applied_at or app.stage_changed_at,
                contact=app.contact_name,
                source=source,
                language=language,
            ),
            user.id,
        )
        app.follow_up_draft = {
            "subject": subject,
            "body": body,
            "created_at": utcnow().isoformat(),
        }
        await self.db.flush()
        return _out(app, job, score, kit)

    async def followed_up(self, user: User, app_id: uuid.UUID) -> ApplicationOut:
        app, job, score, kit = await self._row(user, app_id)
        if app.followed_up_at is None:
            app.followed_up_at = utcnow()
            await self._event(app, EventKind.FOLLOWED_UP)
        await self.db.flush()
        return _out(app, job, score, kit)
