"""The demo's tracker, momentum and notifications: a job search a few weeks in."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import local_today, zone
from app.modules.auth.models import User
from app.modules.brief.models import Match
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.momentum.models import ActivityDay, Goal
from app.modules.notifications.models import Notification
from app.modules.tracker.models import Application, ApplicationEvent, EventKind, Stage, step
from app.scripts.demo_data import DEMO_TIMEZONE
from app.scripts.demo_jobs import DemoJob

FOLLOW_UP_AFTER = timedelta(days=7)


@dataclass(frozen=True)
class Plan:
    """One application: when it was added, and each move since (stage, days ago)."""

    key: str
    added: float
    moves: list[tuple[Stage, float]] = field(default_factory=list)
    kit: str | None = None
    notes: str | None = None
    contact: tuple[str, str] | None = None
    next_step: str | None = None


PLANS = [
    Plan("teratai", added=0.03, moves=[(Stage.PREPARING, 0.02)], kit="teratai"),
    Plan(
        "gajah",
        added=8.9,
        moves=[(Stage.PREPARING, 8.6), (Stage.APPLIED, 8)],
        kit="gajah",
    ),
    Plan(
        "nusantara",
        added=5.9,
        moves=[(Stage.APPLIED, 5), (Stage.INTERVIEW, 2)],
        contact=("Hui Min Ooi, Talent Acquisition", "huimin.ooi@example.com"),
        next_step="Technical interview",
        notes="Panel of three. Bring the evaluation pipeline story.",
    ),
    Plan(
        "seri",
        added=23.5,
        moves=[(Stage.APPLIED, 22), (Stage.INTERVIEW, 15), (Stage.OFFER, 2)],
        contact=("Daniel Wong, Hiring Manager", "daniel.wong@example.com"),
        notes="Offer: RM 14,500 a month, start in January. Reply by Friday.",
    ),
    Plan("rimbun", added=0.9),
    Plan("kancil", added=1.9),
    Plan(
        "petaling",
        added=14.8,
        moves=[(Stage.APPLIED, 14), (Stage.REJECTED, 4)],
        notes="They chose someone with graph experience. Asked for feedback.",
    ),
    Plan("langkawi", added=2.9, moves=[(Stage.APPLIED, 1)]),
]


def _tomorrow_at_ten(now: datetime) -> datetime:
    tomorrow = local_today(DEMO_TIMEZONE) + timedelta(days=1)
    return datetime.combine(tomorrow, time(10, 0), tzinfo=zone(DEMO_TIMEZONE))


async def _application(
    db: AsyncSession,
    user: User,
    plan: Plan,
    job: Job,
    match: Match,
    kits: dict[str, Kit],
    now: datetime,
) -> Application:
    added_at = now - timedelta(days=plan.added)
    stage, changed_at = Stage.SAVED, added_at
    applied_at: datetime | None = None
    furthest = 0
    for moved_to, days in plan.moves:
        stage, changed_at = moved_to, now - timedelta(days=days)
        furthest = max(furthest, step(moved_to))
        if step(moved_to) >= step(Stage.APPLIED) and applied_at is None:
            applied_at = changed_at
    due = applied_at + FOLLOW_UP_AFTER if applied_at else None
    app = Application(
        user_id=user.id,
        job_id=job.id,
        match_id=match.id,
        kit_id=kits[plan.kit].id if plan.kit else None,
        stage=stage,
        position=-changed_at.timestamp(),
        furthest=furthest,
        stage_changed_at=changed_at,
        notes=plan.notes,
        applied_at=applied_at,
        next_step=plan.next_step,
        next_step_at=_tomorrow_at_ten(now) if plan.next_step else None,
        contact_name=plan.contact[0] if plan.contact else None,
        contact_email=plan.contact[1] if plan.contact else None,
        follow_up_due_at=due,
        # The overdue follow-up's nudge is already in the notifications below.
        nudged_at=due if due and due <= now and stage == Stage.APPLIED else None,
        created_at=added_at,
    )
    db.add(app)
    await db.flush()
    db.add(
        ApplicationEvent(
            application_id=app.id, kind=EventKind.ADDED, stage=Stage.SAVED, at=added_at
        )
    )
    for moved_to, days in plan.moves:
        db.add(
            ApplicationEvent(
                application_id=app.id,
                kind=EventKind.STAGE,
                stage=moved_to,
                at=now - timedelta(days=days),
            )
        )
    if plan.next_step:
        db.add(
            ApplicationEvent(
                application_id=app.id,
                kind=EventKind.NEXT_STEP,
                detail={"text": plan.next_step},
                at=changed_at + timedelta(hours=2),
            )
        )
    return app


async def add_tracker(
    db: AsyncSession,
    user: User,
    jobs: dict[str, tuple[Job, Match, DemoJob]],
    kits: dict[str, Kit],
    now: datetime,
) -> int:
    apps: dict[str, Application] = {}
    for plan in PLANS:
        job, match, _ = jobs[plan.key]
        apps[plan.key] = await _application(db, user, plan, job, match, kits, now)

    db.add(Goal(user_id=user.id, weekly_applications=5))
    today = local_today(DEMO_TIMEZONE)
    for days in range(5):
        db.add(
            ActivityDay(
                user_id=user.id,
                day=today - timedelta(days=days),
                checked_at=now - timedelta(days=days),
            )
        )

    todays = [spec for _, _, spec in jobs.values() if spec.days == 0]
    best = max(todays, key=lambda spec: jobs[spec.key][1].score)
    notes = [
        (
            "brief.ready",
            f"{len(todays)} new jobs fit you",
            f"Your best fit today is {jobs[best.key][1].score}% at {best.company}.",
            "/",
            timedelta(minutes=50),
            False,
        ),
        (
            "kit.ready",
            "Your application for Senior AI Engineer is ready",
            "Teratai Bank. Resume, cover letter and answers, every line checked.",
            f"/kits/{kits['teratai'].id}",
            timedelta(minutes=25),
            True,
        ),
        (
            "tracker.follow_up",
            "Follow up with Gajah Logistics?",
            "You applied for Lead Machine Learning Engineer a week ago. "
            "Tailr can draft a short note.",
            f"/tracker?open={apps['gajah'].id}",
            timedelta(days=1),
            False,
        ),
        (
            "message.new",
            "New message from Farah Lim",
            "Hi Aina, we're building a support assistant for our cafes and would love "
            "your help for three months.",
            "/profile/portfolio",
            timedelta(hours=20),
            False,
        ),
    ]
    for kind, title, body, link, ago, read in notes:
        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                kind=kind,
                title=title,
                body=body,
                link=link,
                read_at=now - ago if read else None,
                created_at=now - ago,
            )
        )
    return len(apps)
