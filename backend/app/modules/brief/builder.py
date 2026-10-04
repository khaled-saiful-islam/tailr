"""Build one user's morning brief.

    search ─▶ screen ─▶ filter ─▶ catalog (descriptions, AI reading, vectors)
           ─▶ quick Fit for every candidate ─▶ AI review of the best ─▶ matches

Each stage is saved and announced live, so Today can show progress. Jobs the
user has already been shown (on any site) never come back in a later brief.
"""

from __future__ import annotations

import asyncio
import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.clock import local_today, utcnow
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.brief.models import Brief, BriefStatus, Match
from app.modules.jobs import catalog
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.fit import FitParts, QuickFit, quick_fit, refine
from app.modules.matching.profile_vector import profile_vector
from app.modules.matching.review import FitReview, review_fit
from app.modules.matching.signals import profile_signals
from app.modules.notifications.service import notify
from app.modules.profile.document import ProfileDocument
from app.modules.profile.service import ProfileService, profile_as_text
from app.modules.radar.filters import apply_filters, duplicate_key, reason_to_drop
from app.modules.radar.relevance import relevant_titles
from app.modules.radar.service import RadarService, build_queries
from app.modules.radar.settings import RadarSettings
from app.modules.sources import http
from app.modules.sources.base import JobCard
from app.modules.sources.service import search_many

log = get_logger(__name__)

REVIEW_CONCURRENCY = 4
QUICK_MARGIN = 20  # review jobs whose quick score is within this of the user's bar
CLOSEST_WHEN_EMPTY = 3


@dataclass
class Context:
    user: User
    radar: RadarSettings
    document: ProfileDocument
    seen_keys: set[tuple[str, str]]
    seen_fingerprints: set[str]


async def start_brief(user_id: uuid.UUID, trigger: str) -> uuid.UUID | None:
    """Create the brief record (the UI shows it at once); the worker fills it in."""
    async with session_scope() as db:
        user = await db.get(User, user_id)
        if user is None:
            return None
        running = (
            await db.execute(
                select(Brief).where(Brief.user_id == user_id, Brief.status == BriefStatus.BUILDING)
            )
        ).scalar_one_or_none()
        if running is not None:
            return running.id
        brief = Brief(
            user_id=user_id, local_date=local_today(user.timezone), trigger=trigger, stats={}
        )
        db.add(brief)
        await db.flush()
        return brief.id


async def _context(user_id: uuid.UUID) -> Context | None:
    async with session_scope() as db:
        user = await db.get(User, user_id)
        radar = await RadarService(db).settings_for(user_id)
        document = await ProfileService(db).document_for(user_id)
        if user is None or radar is None or document is None or document.is_empty:
            return None
        rows = (
            await db.execute(
                select(Job.source, Job.external_id, Job.fingerprint)
                .join(Match, Match.job_id == Job.id)
                .where(Match.user_id == user_id)
            )
        ).all()
    return Context(
        user=user,
        radar=radar,
        document=document,
        seen_keys={(r.source, r.external_id) for r in rows},
        seen_fingerprints={r.fingerprint for r in rows},
    )


async def _stage(brief_id: uuid.UUID, user_id: uuid.UUID, stage: str, **stats: object) -> None:
    async with session_scope() as db:
        brief = await db.get(Brief, brief_id)
        if brief is not None:
            brief.stage = stage
            brief.stats = {**(brief.stats or {}), **stats}
    await publish(user_id, "brief.progress", {"id": str(brief_id), "stage": stage})


def _as_card(job: Job, insights: JobInsights | None) -> JobCard:
    return JobCard(
        source=job.source,
        external_id=job.external_id,
        url=job.url,
        title=job.title,
        company=job.company,
        location=job.location,
        posted_at=job.posted_at,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        work_mode=job.work_mode or (insights.work_mode if insights else None),
        employment_type=job.employment_type or (insights.employment_type if insights else None),
        snippet=(job.description_text or job.snippet or "")[:4000],
    )


def passes_after_reading(job: Job, radar: RadarSettings) -> bool:
    """Re-check the radar with what the full description revealed."""
    insights = JobInsights.model_validate(job.insights) if job.insights else None
    reason = reason_to_drop(_as_card(job, insights), radar, utcnow())
    if reason in {"too_old", "duplicate"}:
        return True  # checked on the search card already
    if reason is not None:
        return False
    if radar.seniority and insights and insights.seniority:
        return insights.seniority in radar.seniority or (
            insights.seniority in {"entry", "mid", "senior"}
            and bool({"entry", "mid", "senior"} & set(radar.seniority))
        )
    return True


async def _search(context: Context) -> tuple[list[JobCard], dict[str, object]]:
    radar = context.radar
    with http.patient():
        outcomes = await search_many(radar.sources, build_queries(radar))
    cards: list[JobCard] = []
    seen: set[tuple[str, str]] = set()
    for outcome in outcomes:
        for card in outcome.cards:
            if (card.source, card.external_id) not in seen:
                seen.add((card.source, card.external_id))
                cards.append(card)
    relevant = await relevant_titles(radar.roles, [c.title for c in cards], user_id=context.user.id)
    on_target = [c for c in cards if c.title in relevant]
    filtered = apply_filters(on_target, radar, utcnow())
    fresh = [
        c
        for c in filtered.kept
        if (c.source, c.external_id) not in context.seen_keys
        and duplicate_key(c) not in context.seen_fingerprints
    ]
    stats: dict[str, object] = {
        "found": len(cards),
        "on_target": len(on_target),
        "matching": len(filtered.kept),
        "new": len(fresh),
        "sources": {o.source: {"status": o.status, "found": len(o.cards)} for o in outcomes},
    }
    return fresh, stats


async def _review_all(
    candidates: list[tuple[Job, QuickFit]], profile_text: str, user_id: uuid.UUID
) -> list[FitReview | None]:
    gate = asyncio.Semaphore(REVIEW_CONCURRENCY)

    async def one(job: Job) -> FitReview | None:
        async with gate:
            try:
                return await review_fit(job, profile_text, user_id=user_id)
            except AppError as error:
                log.info("fit_review_failed", job=str(job.id), error=error.message)
                return None

    return list(await asyncio.gather(*(one(job) for job, _ in candidates)))


async def _save_matches(
    brief_id: uuid.UUID,
    user_id: uuid.UUID,
    rows: list[tuple[Job, FitParts, FitReview | None, QuickFit]],
) -> int:
    if not rows:
        return 0
    values = [
        {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "job_id": job.id,
            "brief_id": brief_id,
            "origin": "brief",
            "score": parts.score,
            "parts": parts.as_dict(),
            "review": (
                review.model_dump(mode="json")
                if review
                else {
                    "headline": None,
                    "matched": quick.matched_skills,
                    "missing": quick.missing_skills,
                }
            ),
            "status": "new",
        }
        for job, parts, review, quick in rows
    ]
    async with session_scope() as db:
        result = await db.execute(
            insert(Match)
            .values(values)
            .on_conflict_do_nothing(constraint="uq_matches_user_job")
            .returning(Match.id)
        )
        return len(result.all())


async def run_brief(brief_id: uuid.UUID) -> None:
    async with session_scope() as db:
        brief = await db.get(Brief, brief_id)
        if brief is None or brief.status != BriefStatus.BUILDING:
            return
        user_id = brief.user_id
    settings = get_settings()
    try:
        context = await _context(user_id)
        if context is None:
            raise AppError("Finish your profile and radar first.", code="not_ready")

        fresh, stats = await _search(context)
        await _stage(brief_id, user_id, "reading", **stats)

        jobs = await catalog.load(await catalog.ingest(fresh))
        await catalog.fetch_missing_details(jobs, cap=settings.brief_max_new_details)
        await catalog.read_missing(jobs, user_id=user_id)
        unreadable = sum(1 for job in jobs if not catalog.is_readable(job))
        # Jobs we couldn't read yet stay in the catalog and are tried again next brief.
        jobs = [
            job
            for job in jobs
            if catalog.is_readable(job) and passes_after_reading(job, context.radar)
        ]
        await _stage(brief_id, user_id, "measuring", read=len(jobs), unreadable=unreadable)

        await catalog.embed_missing(jobs, user_id=user_id)
        vector = await profile_vector(user_id)
        signals = profile_signals(context.document)
        scored = sorted(
            ((job, quick_fit(job, signals, context.radar, vector)) for job in jobs),
            key=lambda pair: pair[1].parts.score,
            reverse=True,
        )
        bar = context.radar.min_fit
        candidates = [pair for pair in scored if pair[1].parts.score >= bar - QUICK_MARGIN][
            : settings.brief_explain_top
        ]
        if not candidates:
            candidates = scored[:CLOSEST_WHEN_EMPTY]
        await _stage(brief_id, user_id, "reviewing", candidates=len(candidates))

        reviews = await _review_all(candidates, profile_as_text(context.document), user_id)
        finals = []
        for (job, quick), review in zip(candidates, reviews, strict=True):
            parts = (
                refine(
                    quick.parts,
                    skill_coverage=review.skill_coverage,
                    experience_fit=review.experience_fit,
                )
                if review
                else quick.parts
            )
            finals.append((job, parts, review, quick))
        finals.sort(key=lambda row: row[1].score, reverse=True)
        keep = [row for row in finals if row[1].score >= bar]
        below_bar = not keep
        if below_bar:
            keep = finals[:CLOSEST_WHEN_EMPTY]
        saved = await _save_matches(brief_id, user_id, keep)

        async with session_scope() as db:
            brief = await db.get(Brief, brief_id)
            if brief is not None:
                brief.status = BriefStatus.READY
                brief.stage = "done"
                brief.finished_at = utcnow()
                brief.stats = {**(brief.stats or {}), "matches": saved, "below_bar": below_bar}
        await publish(user_id, "brief.ready", {"id": str(brief_id), "matches": saved})
        await notify(
            user_id,
            kind="brief.ready",
            title="Your brief is ready",
            body=brief_summary(saved, keep[0][0].company if saved and keep else None),
            link="/",
        )
        log.info("brief_ready", brief=str(brief_id), matches=saved)
        from app.modules.brief.mailer import email_brief

        await email_brief(brief_id)
    except Exception as error:
        message = (
            error.message
            if isinstance(error, AppError)
            else "Something went wrong building your brief."
        )
        if not isinstance(error, AppError):
            log.exception("brief_failed", brief=str(brief_id))
        async with session_scope() as db:
            brief = await db.get(Brief, brief_id)
            if brief is not None:
                brief.status = BriefStatus.FAILED
                brief.error = message
                brief.finished_at = utcnow()
        await publish(user_id, "brief.ready", {"id": str(brief_id), "failed": True})
        await notify(
            user_id,
            kind="brief.failed",
            title="Your brief didn't finish",
            body=f"{message} You can run it again from Today.",
            link="/",
        )


def brief_summary(new_matches: int, top_company: str | None) -> str:
    """One line for the notification: how many jobs, and who fits best."""
    if new_matches == 0:
        return "No new jobs fit this time. Tailr looks again tomorrow morning."
    jobs = "1 job" if new_matches == 1 else f"{new_matches} jobs"
    best = f" {top_company} fits best." if top_company else ""
    return f"{jobs} measured against your profile.{best}"


def place_label(location: str | None) -> str | None:
    """'Petaling Jaya, Selangor, Malaysia' → 'Petaling Jaya'."""
    if not location:
        return None
    return re.split(r",", location)[0].strip() or None
