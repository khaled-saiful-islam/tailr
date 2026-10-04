"""Keep the shared job catalog complete: insert listings, fetch descriptions,
let the AI read each job, and embed it. Each step only does what's missing,
so a job is processed once no matter how many users it matches.

Network work runs concurrently; database writes happen afterwards in one short
transaction, so no connection is held while waiting on a job site or the AI.
"""

from __future__ import annotations

import asyncio
import random
import uuid
from collections.abc import Sequence
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.ai.client import get_ai
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.jobs.insights import INSIGHTS_SYSTEM, JobInsights
from app.modules.jobs.models import Job
from app.modules.radar.filters import duplicate_key
from app.modules.sources import http, registry
from app.modules.sources.base import JobCard, JobDetail, JobRef, SourceError
from app.modules.sources.service import RunRecord, fetch_details, save_runs

log = get_logger(__name__)

RETRY_FAILED_AFTER = timedelta(hours=1)
# Shorter than this, a description is too thin to judge a job by.
MIN_DESCRIPTION_CHARS = 200
READ_CONCURRENCY = 4
EMBED_BATCH = 32
MAX_READ_CHARS = 6000


async def ingest(cards: Sequence[JobCard]) -> list[uuid.UUID]:
    """Insert new listings and refresh known ones. Returns job ids in card order."""
    if not cards:
        return []
    now = utcnow()
    rows = [
        {
            "id": uuid.uuid4(),
            "source": c.source,
            "external_id": c.external_id,
            "url": c.url,
            "title": c.title[:300],
            "company": c.company[:300],
            "location": (c.location or None) and c.location[:300],
            "work_mode": c.work_mode,
            "employment_type": c.employment_type,
            "posted_at": c.posted_at,
            "posted_text": (c.posted_text or None) and c.posted_text[:64],
            "salary_text": (c.salary_text or None) and c.salary_text[:200],
            "salary_min": c.salary_min,
            "salary_max": c.salary_max,
            "snippet": c.snippet,
            "company_logo": (c.company_logo or None) and c.company_logo[:600],
            "fingerprint": duplicate_key(c)[:600],
            "detail_status": "pending",
            "first_seen_at": now,
            "last_seen_at": now,
        }
        for c in cards
    ]
    base = insert(Job).values(rows)
    excluded = base.excluded
    statement = base.on_conflict_do_update(
        constraint="uq_jobs_source_external_id",
        set_={
            "last_seen_at": now,
            "title": excluded.title,
            "location": excluded.location,
            "salary_text": func.coalesce(excluded.salary_text, Job.salary_text),
            "salary_min": func.coalesce(excluded.salary_min, Job.salary_min),
            "salary_max": func.coalesce(excluded.salary_max, Job.salary_max),
            "posted_at": func.coalesce(excluded.posted_at, Job.posted_at),
            "posted_text": excluded.posted_text,
        },
    ).returning(Job.id, Job.source, Job.external_id)
    async with session_scope() as db:
        result = await db.execute(statement)
        ids = {(source, external_id): job_id for job_id, source, external_id in result.all()}
    return [ids[(c.source, c.external_id)] for c in cards]


async def load(ids: Sequence[uuid.UUID]) -> list[Job]:
    if not ids:
        return []
    async with session_scope() as db:
        jobs = (await db.execute(select(Job).where(Job.id.in_(ids)))).scalars().all()
    order = {job_id: index for index, job_id in enumerate(ids)}
    return sorted(jobs, key=lambda job: order.get(job.id, 0))


async def fetch_missing_details(jobs: Sequence[Job], *, cap: int) -> int:
    """Fetch full descriptions for up to `cap` jobs that don't have one yet."""
    retry_before = utcnow() - RETRY_FAILED_AFTER
    todo = [
        job
        for job in jobs
        if job.detail_status == "pending"
        or (
            job.detail_status == "failed"
            and (job.detail_fetched_at is None or job.detail_fetched_at < retry_before)
        )
    ][:cap]
    if not todo:
        return 0
    gates: dict[str, asyncio.Semaphore] = {}
    runs: list[RunRecord] = []

    async def one(job: Job) -> tuple[uuid.UUID, JobDetail | None]:
        source = registry.get_source(job.source)
        concurrency = getattr(source, "detail_concurrency", 2)
        low, high = getattr(source, "detail_pause", (0.2, 0.8))
        gate = gates.setdefault(job.source, asyncio.Semaphore(concurrency))
        async with gate:
            await asyncio.sleep(random.uniform(low, high))
            try:
                with http.patient():
                    detail = await fetch_details(
                        JobRef(source=job.source, external_id=job.external_id, url=job.url), runs
                    )
                return job.id, detail
            except SourceError as error:
                log.info("job_details_failed", source=job.source, error=error.message)
                return job.id, None

    results = await asyncio.gather(*(one(job) for job in todo))
    await save_runs(runs)
    now = utcnow()
    async with session_scope() as db:
        for job_id, detail in results:
            row = await db.get(Job, job_id)
            if row is None:
                continue
            row.detail_fetched_at = now
            if detail is None:
                row.detail_status = "failed"
                continue
            row.detail_status = "ok"
            row.description_text = detail.description_text[:40_000]
            row.applicants = (detail.applicants or None) and detail.applicants[:64]
            row.industries = (detail.industries or None) and detail.industries[:300]
            row.source_seniority = (detail.seniority or None) and detail.seniority[:64]
            if detail.employment_type and not row.employment_type:
                row.employment_type = (
                    detail.employment_type.lower().replace("-", "_").replace(" ", "_")[:32]
                )
    for job in todo:  # keep the caller's objects in step with the database
        found = next((d for i, d in results if i == job.id), None)
        job.detail_status = "ok" if found else "failed"
        if found:
            job.description_text = found.description_text
    return sum(1 for _, detail in results if detail)


async def read_missing(jobs: Sequence[Job], *, user_id: uuid.UUID | None = None) -> int:
    """Let the AI read each job that hasn't been read yet."""
    todo = [job for job in jobs if job.insights is None and job.text_for_reading]
    if not todo:
        return 0
    gate = asyncio.Semaphore(READ_CONCURRENCY)
    ai = get_ai()
    model = get_settings().llm_fast_model

    async def one(job: Job) -> tuple[uuid.UUID, JobInsights | None]:
        async with gate:
            try:
                insights = await ai.structured(
                    [
                        {"role": "system", "content": INSIGHTS_SYSTEM},
                        {
                            "role": "user",
                            "content": f"Job title: {job.title}\nCompany: {job.company}\n\n"
                            f"{job.text_for_reading[:MAX_READ_CHARS]}",
                        },
                    ],
                    JobInsights,
                    purpose="jobs.insights",
                    user_id=user_id,
                    model=model,
                    temperature=0.0,
                    max_tokens=900,
                )
                return job.id, insights.tidy()
            except AppError as error:
                log.info("job_read_failed", job=str(job.id), error=error.message)
                return job.id, None

    results = await asyncio.gather(*(one(job) for job in todo))
    now = utcnow()
    by_id = {job.id: job for job in todo}
    async with session_scope() as db:
        for job_id, insights in results:
            if insights is None:
                continue
            payload = insights.model_dump(mode="json")
            row = await db.get(Job, job_id)
            if row is not None:
                row.insights = payload
                row.insights_at = now
                row.work_mode = row.work_mode or insights.work_mode  # type: ignore[assignment]
                row.employment_type = row.employment_type or insights.employment_type
                if row.salary_max is None and insights.salary_max:
                    row.salary_min, row.salary_max = insights.salary_min, insights.salary_max
            by_id[job_id].insights = payload
    return sum(1 for _, insights in results if insights)


def is_readable(job: Job) -> bool:
    """Enough of the ad to judge the job by (not just a title)."""
    return len(job.description_text or job.snippet or "") >= MIN_DESCRIPTION_CHARS


def embedding_text(job: Job) -> str:
    insights = JobInsights.model_validate(job.insights) if job.insights else None
    parts = [job.title, job.company]
    if insights:
        parts += [
            insights.summary,
            "Skills: " + ", ".join(insights.required_skills + insights.nice_skills),
        ]
    parts.append(job.text_for_reading[:1500])
    return "\n".join(part for part in parts if part)


async def embed_missing(jobs: Sequence[Job], *, user_id: uuid.UUID | None = None) -> int:
    todo = [job for job in jobs if job.embedding is None]
    done = 0
    for start in range(0, len(todo), EMBED_BATCH):
        batch = todo[start : start + EMBED_BATCH]
        try:
            vectors = await get_ai().embed(
                [embedding_text(job) for job in batch], purpose="jobs.embed", user_id=user_id
            )
        except AppError as error:
            log.info("job_embed_failed", error=error.message)
            continue
        async with session_scope() as db:
            for job, vector in zip(batch, vectors, strict=True):
                row = await db.get(Job, job.id)
                if row is not None:
                    row.embedding = vector
                job.embedding = vector
        done += len(batch)
    return done
