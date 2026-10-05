"""Nudges that bring you back: follow up a week after applying, and a heads-up the day
before a next step (an interview, a test, a call)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.clock import utcnow, zone
from app.core.db import session_scope
from app.modules.auth.models import User
from app.modules.jobs.models import Job
from app.modules.notifications.service import notify
from app.modules.tracker.models import Application, Stage

BATCH = 200
HEADS_UP = timedelta(hours=24)


@dataclass(frozen=True)
class Nudge:
    user_id: uuid.UUID
    kind: str
    title: str
    body: str
    link: str


def when(moment: datetime, timezone: str | None) -> str:
    """'Tue 6 Oct, 10:00 am' in the user's own time zone."""
    local = moment.astimezone(zone(timezone))
    hour = local.strftime("%I:%M").lstrip("0")
    return f"{local:%a} {local.day} {local:%b}, {hour} {local:%p}".replace("AM", "am").replace(
        "PM", "pm"
    )


async def collect(now: datetime | None = None) -> list[Nudge]:
    """Find what's due, mark it as sent, and return the messages. One transaction."""
    now = now or utcnow()
    nudges: list[Nudge] = []
    async with session_scope() as db:
        due = (
            await db.execute(
                select(Application, Job, User)
                .join(Job, Job.id == Application.job_id)
                .join(User, User.id == Application.user_id)
                .where(
                    User.is_active.is_(True),
                    Application.stage == Stage.APPLIED,
                    Application.follow_up_due_at <= now,
                    Application.nudged_at.is_(None),
                    Application.followed_up_at.is_(None),
                )
                .limit(BATCH)
            )
        ).all()
        for app, job, user in due:
            app.nudged_at = now
            nudges.append(
                Nudge(
                    user_id=user.id,
                    kind="tracker.follow_up",
                    title=f"Follow up with {job.company}?",
                    body=f"You applied for {job.title} a week ago. Tailr can draft a short note.",
                    link=f"/applications/{app.id}",
                )
            )
        soon = (
            await db.execute(
                select(Application, Job, User)
                .join(Job, Job.id == Application.job_id)
                .join(User, User.id == Application.user_id)
                .where(
                    User.is_active.is_(True),
                    Application.stage.not_in([Stage.REJECTED]),
                    Application.next_step_at > now,
                    Application.next_step_at <= now + HEADS_UP,
                    Application.reminded_at.is_(None),
                )
                .limit(BATCH)
            )
        ).all()
        for app, job, user in soon:
            app.reminded_at = now
            moment = app.next_step_at or now  # never None here: filtered above
            step = app.next_step or "Your next step"
            nudges.append(
                Nudge(
                    user_id=user.id,
                    kind="tracker.next_step",
                    title=f"{step}: {job.company}",
                    body=f"{job.title}, {when(moment, user.timezone)}.",
                    link=f"/applications/{app.id}",
                )
            )
    return nudges


async def send_due(now: datetime | None = None) -> int:
    nudges = await collect(now)
    for nudge in nudges:
        await notify(
            nudge.user_id, kind=nudge.kind, title=nudge.title, body=nudge.body, link=nudge.link
        )
    return len(nudges)
