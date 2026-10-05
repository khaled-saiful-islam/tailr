"""What each kind of background task does. Each calls the feature's own service.

A handler returns what the work produced (kept on the task, so leaving the page loses
nothing), where to see it, and, for longer work, a notification to send when it's done.
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.brief.service import BriefService
from app.modules.jobs.paste import paste_job
from app.modules.kits.interview import InterviewService
from app.modules.profile.schemas import CoachBulletRequest
from app.modules.profile.service import ProfileService
from app.modules.public_profile.service import PublicProfileService
from app.modules.radar.service import RadarService
from app.modules.radar.settings import RadarSettings
from app.modules.tracker.service import TrackerService

Stage = Callable[[str], Awaitable[None]]


@dataclass(frozen=True)
class Outcome:
    result: Any
    link: str | None = None
    # (title, body) of the notification sent when done. Quick, on-page work has none.
    note: tuple[str, str | None] | None = None


Handler = Callable[[AsyncSession, User, dict[str, Any], Stage], Awaitable[Outcome]]


async def add_job(db: AsyncSession, user: User, data: dict[str, Any], stage: Stage) -> Outcome:
    await stage("Reading the job ad")
    match_id = await paste_job(
        db,
        user,
        url=data.get("url"),
        title=data.get("title"),
        company=data.get("company"),
        text=data.get("text"),
    )
    detail = await BriefService(db).match_detail(user, match_id)
    job = detail.job
    return Outcome(
        result={
            "match_id": str(match_id),
            "title": job.title,
            "company": job.company,
            "score": detail.score,
        },
        link=f"/jobs/{match_id}",
        note=(f"Job added: {job.title}", f"{job.company}. A {detail.score}% match."),
    )


async def suggest_roles(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Reading your CV for job titles")
    out = await RadarService(db).suggest(user)
    return Outcome(result=out.model_dump(mode="json"), link="/preferences")


async def preview_jobs(db: AsyncSession, user: User, data: dict[str, Any], stage: Stage) -> Outcome:
    await stage("Looking at LinkedIn and JobStreet")
    settings = RadarSettings.model_validate(data["settings"])
    out = await RadarService(db).preview(user, settings)
    return Outcome(result=out.model_dump(mode="json"), link="/preferences")


async def suggest_highlights(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Finding your best numbers")
    out = await PublicProfileService(db).suggest_highlights(user)
    return Outcome(result=[item.model_dump(mode="json") for item in out], link="/profile/website")


async def draft_website(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Writing from your profile, then checking every line")
    out = await PublicProfileService(db).draft(user, data["parts"])
    return Outcome(
        result=out.model_dump(mode="json"),
        link="/profile/website",
        note=("Your website draft is ready", "Open My website to look it over."),
    )


async def improve_point(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Writing a stronger version")
    out = await ProfileService(db).coach_bullet(user, CoachBulletRequest.model_validate(data))
    return Outcome(result=out.model_dump(mode="json"), link="/profile")


async def write_summary(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Writing your summary")
    out = await ProfileService(db).write_summary(user)
    return Outcome(result=out.model_dump(mode="json"), link="/profile")


async def draft_follow_up(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Writing a short, friendly note")
    application_id = uuid.UUID(data["application_id"])
    out = await TrackerService(db).draft(user, application_id)
    return Outcome(
        result=out.model_dump(mode="json"),
        link=f"/applications/{application_id}",
        note=("Your follow-up email is ready", f"For {out.job.title} at {out.job.company}."),
    )


async def interview_plan(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    await stage("Reading the job ad and your profile")
    kit_id = uuid.UUID(data["kit_id"])
    plan, job = await InterviewService(db).build_plan(user, kit_id, stage)
    return Outcome(
        result={"questions": len(plan.questions)},
        link=f"/apply/{kit_id}?tab=interview",
        note=(
            "Your interview plan is ready",
            f"{job.title} at {job.company}: {len(plan.questions)} questions, a 60-second "
            "pitch and questions to ask them.",
        ),
    )


async def interview_feedback(
    db: AsyncSession, user: User, data: dict[str, Any], stage: Stage
) -> Outcome:
    kit_id = uuid.UUID(data["kit_id"])
    attempt = await InterviewService(db).give_feedback(
        user, kit_id, data["question_id"], data["answer"], stage
    )
    return Outcome(result=attempt.model_dump(mode="json"), link=f"/apply/{kit_id}?tab=interview")


HANDLERS: dict[str, Handler] = {
    "job.add": add_job,
    "preferences.suggest": suggest_roles,
    "preferences.preview": preview_jobs,
    "website.highlights": suggest_highlights,
    "website.draft": draft_website,
    "profile.improve_point": improve_point,
    "profile.summary": write_summary,
    "applications.follow_up": draft_follow_up,
    "interview.plan": interview_plan,
    "interview.feedback": interview_feedback,
}

# What a failure says in the notification, for work that notifies.
FAILED_TITLE = {
    "job.add": "Couldn't add that job",
    "website.draft": "Your website draft didn't finish",
    "applications.follow_up": "Your follow-up email didn't finish",
    "interview.plan": "Your interview plan didn't finish",
}
