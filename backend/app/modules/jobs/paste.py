"""Add a job Tailr didn't find: paste a link (LinkedIn, JobStreet or any page) or the text.

The job joins the catalog, is read by the AI and measured against the profile
like any brief job, and becomes a match the user can tailor an application for.
"""

from __future__ import annotations

import hashlib
import re
import uuid

from selectolax.lexbor import LexborHTMLParser
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import AppError, UnprocessableError
from app.core.safe_http import check_link, fetch_public
from app.modules.auth.models import User
from app.modules.brief.models import Match
from app.modules.jobs import catalog
from app.modules.jobs.models import Job
from app.modules.matching.fit import quick_fit, refine
from app.modules.matching.profile_vector import profile_vector
from app.modules.matching.review import review_fit
from app.modules.matching.signals import profile_signals
from app.modules.profile.service import ProfileService, profile_as_text
from app.modules.radar.service import RadarService
from app.modules.radar.settings import RadarSettings
from app.modules.sources.base import JobCard, JobDetail, JobRef, SourceError
from app.modules.sources.service import fetch_details
from app.modules.sources.text import clean, html_to_text
from app.modules.tracker.service import TrackerService

PASTES_PER_DAY = 30
MIN_TEXT = 200
MAX_TEXT = 40_000

_LINKEDIN = re.compile(r"linkedin\.com/.*?(?:jobs/view/(?:[^/?#]*-)?|currentJobId=)(\d{6,})", re.I)
_JOBSTREET = re.compile(r"jobstreet\.com/(?:[a-z-]+/)?job/(\d{5,})", re.I)


def recognise(url: str) -> tuple[str, str] | None:
    """('linkedin', id) or ('jobstreet', id) for links Tailr can read directly."""
    if match := _LINKEDIN.search(url):
        return "linkedin", match.group(1)
    if match := _JOBSTREET.search(url):
        return "jobstreet", match.group(1)
    return None


async def _read_any_page(url: str) -> tuple[str | None, str]:
    """Best effort for other sites: the page title and its main text (public pages only)."""
    page = await fetch_public(url, headers={"User-Agent": get_settings().source_user_agent})
    tree = LexborHTMLParser(page.text)
    for node in tree.css("script, style, nav, header, footer, noscript"):
        node.decompose()
    main = tree.css_first("main") or tree.css_first("article") or tree.body
    title_node = tree.css_first("h1") or tree.css_first("title")
    return (clean(title_node.text()) if title_node else None), html_to_text(
        main.html if main else ""
    )


async def precheck_paste(
    db: AsyncSession,
    user: User,
    *,
    url: str | None,
    title: str | None,
    company: str | None,
    text: str | None,
) -> None:
    """What can be told at once, before any fetching: answered straight away."""
    if url:
        check_link(url)
    document = await ProfileService(db).document_for(user.id)
    if document is None or document.is_empty:
        raise UnprocessableError(
            "Build your profile first, so Tailr can measure the job.", code="no_profile"
        )
    if not url:
        if len((text or "").strip()) < MIN_TEXT:
            raise UnprocessableError(
                "That's too little to go on. Paste the full job description.", code="too_short"
            )
        if not (title or "").strip() or not (company or "").strip():
            raise UnprocessableError("Add the job title and the company.", code="missing_title")


async def paste_job(
    db: AsyncSession,
    user: User,
    *,
    url: str | None,
    title: str | None,
    company: str | None,
    text: str | None,
) -> uuid.UUID:
    """Create (or find) the match for a pasted job. Returns the match id."""
    await rate_limit.enforce(
        f"paste:{user.id}",
        limit=PASTES_PER_DAY,
        window_seconds=24 * 3600,
        message="That's a lot of jobs added today. Try again tomorrow.",
    )
    document = await ProfileService(db).document_for(user.id)
    if document is None or document.is_empty:
        raise UnprocessableError(
            "Build your profile first, so Tailr can measure the job.", code="no_profile"
        )

    source, external_id, detail = "manual", "", None
    description = (text or "").strip()[:MAX_TEXT]
    if url:
        recognised = recognise(url)
        if recognised:
            source, external_id = recognised
            try:
                detail = await fetch_details(
                    JobRef(source=source, external_id=external_id, url=url)
                )
            except SourceError as error:
                raise UnprocessableError(
                    "That job site didn't answer. Paste the job description instead.",
                    code="page_unreadable",
                ) from error
            description = detail.description_text
        elif not description:
            page_title, description = await _read_any_page(url)
            title = title or page_title
    if len(description) < MIN_TEXT:
        raise UnprocessableError(
            "That's too little to go on. Paste the full job description.", code="too_short"
        )
    title = (detail.title if detail else None) or (title or "").strip()
    company = (detail.company if detail else None) or (company or "").strip()
    if not title or not company:
        raise UnprocessableError("Add the job title and the company.", code="missing_title")
    if not external_id:
        external_id = hashlib.sha256((url or description).encode()).hexdigest()[:24]

    card = JobCard(
        source=source,
        external_id=external_id,
        url=url or f"manual:{external_id}",
        title=title[:300],
        company=company[:300],
        location=detail.location if detail else None,
        posted_at=utcnow(),
        salary_text=detail.salary_text if detail else None,
        employment_type=detail.employment_type if detail else None,
    )
    await db.commit()  # catalog writes use their own transactions
    [job_id] = await catalog.ingest([card])
    [job] = await catalog.load([job_id])
    if not job.description_text:
        await _store_description(job, description, detail)
    await catalog.read_missing([job], user_id=user.id)
    await catalog.embed_missing([job], user_id=user.id)

    radar = await RadarService(db).settings_for(user.id) or RadarSettings(roles=[title])
    quick = quick_fit(job, profile_signals(document), radar, await profile_vector(user.id))
    parts, review = quick.parts, None
    try:
        review = await review_fit(job, profile_as_text(document), user_id=user.id)
        parts = refine(
            parts, skill_coverage=review.skill_coverage, experience_fit=review.experience_fit
        )
    except AppError:
        review = None

    values = {
        "id": uuid.uuid4(),
        "user_id": user.id,
        "job_id": job.id,
        "brief_id": None,
        "origin": "pasted",
        "score": parts.score,
        "parts": parts.as_dict(),
        "review": review.model_dump(mode="json")
        if review
        else {"headline": None, "matched": quick.matched_skills, "missing": quick.missing_skills},
        "status": "saved",
    }
    await db.execute(
        insert(Match).values(values).on_conflict_do_nothing(constraint="uq_matches_user_job")
    )
    match_id = await db.scalar(
        select(Match.id).where(Match.user_id == user.id, Match.job_id == job.id)
    )
    assert match_id is not None
    await TrackerService(db).track(user.id, job_id=job.id, match_id=match_id)
    return match_id


async def _store_description(job: Job, description: str, detail: JobDetail | None) -> None:
    from app.core.db import session_scope

    async with session_scope() as session:
        row = await session.get(Job, job.id)
        if row is not None:
            row.description_text = description
            row.detail_status = "ok"
            row.detail_fetched_at = utcnow()
    job.description_text = description
    job.detail_status = "ok"
