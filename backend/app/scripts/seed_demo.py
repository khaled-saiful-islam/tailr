"""Create the demo account: `python -m app.scripts.seed_demo` (or `make demo`).

Everything comes from fixed data in this folder: no network, no AI, no job sites. Running
it again replaces the demo account (and its pictures) with a fresh one.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import local_today, utcnow
from app.core.config import get_settings
from app.core.db import init_engine, session_scope
from app.core.security import hash_password
from app.modules.auth.models import OnboardingStep, User
from app.modules.brief.models import Brief, BriefStatus, Match
from app.modules.cv.content import content_from_profile
from app.modules.cv.models import Cv
from app.modules.cv.schemas import CvOptions
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.matching.fit import FitParts
from app.modules.matching.review import FitReview, Gap
from app.modules.media.models import StoredImage
from app.modules.media.processing import process_image
from app.modules.profile.document import ProfileDocument, draft_to_document
from app.modules.profile.models import Profile
from app.modules.profile.strength import score_profile
from app.modules.public_profile.models import PublicProfile
from app.modules.radar.models import Radar
from app.modules.radar.schedule import next_brief_at
from app.scripts.demo_data import (
    COVERS,
    DEMO_EMAIL,
    DEMO_NAME,
    DEMO_SLUG,
    DEMO_TIMEZONE,
    DEMO_USERNAME,
    GALLERY,
    profile_draft,
    radar_settings,
)
from app.scripts.demo_images import cover
from app.scripts.demo_jobs import JOBS, DemoJob, description, insights
from app.scripts.demo_kits import gajah_kit, teratai_kit
from app.scripts.demo_portfolio import add_portfolio
from app.scripts.demo_tracker import add_tracker
from app.storage.files import get_storage

DEFAULT_DEMO_PASSWORD = "Tailr-demo-2026"  # noqa: S105 - documented demo default
JOB_PREFIX = "tailr-demo-"


@dataclass(frozen=True)
class DemoSummary:
    user_id: uuid.UUID
    email: str
    password: str
    jobs: int
    kits: int
    applications: int


async def _remove_existing(db: AsyncSession) -> list[str]:
    """Delete the old demo account (rows cascade) and the shared demo jobs; return file keys."""
    keys: list[str] = []
    user = (await db.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
    if user is not None and not user.is_demo:
        raise SystemExit(f"{DEMO_EMAIL} belongs to a real account; not seeding.")
    if user is not None:
        keys += list(
            (await db.execute(select(StoredImage.key).where(StoredImage.user_id == user.id)))
            .scalars()
            .all()
        )
        for model in (PublicProfile, Cv):
            og = await db.scalar(select(model.og_key).where(model.user_id == user.id))
            if og:
                keys.append(og)
        await db.execute(delete(User).where(User.id == user.id))
    await db.execute(delete(Job).where(Job.external_id.like(f"{JOB_PREFIX}%")))
    taken = await db.scalar(
        select(User.email).where(User.username == DEMO_USERNAME, User.email != DEMO_EMAIL)
    )
    if taken:
        raise SystemExit(f"The username '{DEMO_USERNAME}' belongs to {taken}; not seeding.")
    return keys


async def _store_image(db: AsyncSession, user_id: uuid.UUID, png: bytes) -> StoredImage:
    processed = await asyncio.to_thread(process_image, png, purpose="project")
    key = await get_storage().save(processed.data, folder="images", suffix="webp")
    image = StoredImage(
        user_id=user_id,
        purpose="project",
        key=key,
        width=processed.width,
        height=processed.height,
        bytes=len(processed.data),
    )
    db.add(image)
    await db.flush()
    return image


async def _jobs_and_matches(
    db: AsyncSession, user: User, brief: Brief, now: datetime
) -> dict[str, tuple[Job, Match, DemoJob]]:
    out: dict[str, tuple[Job, Match, DemoJob]] = {}
    for index, spec in enumerate(JOBS):
        matched_at = now - timedelta(days=spec.days, hours=1 + index % 3)
        job = Job(
            source=spec.source,
            external_id=f"{JOB_PREFIX}{spec.key}",
            url=f"https://example.com/jobs/{spec.key}",
            title=spec.title,
            company=spec.company,
            location=spec.location,
            work_mode=spec.mode,
            employment_type="full_time",
            posted_at=matched_at - timedelta(hours=10),
            salary_min=spec.pay[0] if spec.pay else None,
            salary_max=spec.pay[1] if spec.pay else None,
            salary_text=f"RM {spec.pay[0]:,} \u2013 RM {spec.pay[1]:,}" if spec.pay else None,
            snippet=spec.summary,
            fingerprint=f"{JOB_PREFIX}{spec.key}",
            description_text=description(spec),
            detail_status="ok",
            detail_fetched_at=matched_at,
            insights=JobInsights.model_validate(insights(spec)).tidy().model_dump(mode="json"),
            insights_at=matched_at,
            first_seen_at=matched_at,
            last_seen_at=now,
        )
        db.add(job)
        await db.flush()
        review = FitReview(
            headline=spec.headline,
            why=spec.why,
            matched=[s for s in spec.required if s not in {g["text"] for g in spec.gaps}][:6],
            missing=[g["text"] for g in spec.gaps],
            gaps=[Gap.model_validate(gap) for gap in spec.gaps],
            skill_coverage=spec.parts["skills"],
            experience_fit=spec.parts["experience"],
        )
        match = Match(
            user_id=user.id,
            job_id=job.id,
            brief_id=brief.id if spec.days == 0 else None,
            origin="brief",
            score=FitParts(**spec.parts).score,
            parts=spec.parts,
            review=review.model_dump(mode="json"),
            status=spec.status,
            created_at=matched_at,
            seen_at=matched_at if spec.status != "new" else None,
            status_changed_at=matched_at if spec.status != "new" else None,
        )
        db.add(match)
        out[spec.key] = (job, match, spec)
    await db.flush()
    return out


async def _kits(
    db: AsyncSession,
    user: User,
    document: ProfileDocument,
    jobs: dict[str, tuple[Job, Match, DemoJob]],
) -> dict[str, Kit]:
    """Two finished kits: one being prepared, one already sent."""
    kits: dict[str, Kit] = {}
    for key, build in (("teratai", teratai_kit), ("gajah", gajah_kit)):
        job, match, _ = jobs[key]
        kit = Kit(
            user_id=user.id,
            job_id=job.id,
            match_id=match.id,
            status="ready",
            stage="done",
            language="en",
            tone="confident",
            version=1,
            **build(document),
        )
        db.add(kit)
        kits[key] = kit
    await db.flush()
    return kits


async def seed_demo() -> DemoSummary:
    settings = get_settings()
    password = settings.seed_demo_password
    if settings.is_production and password == DEFAULT_DEMO_PASSWORD:
        raise SystemExit("Set SEED_DEMO_PASSWORD before seeding a demo account in production.")

    async with session_scope() as db:
        old_files = await _remove_existing(db)
    for key in old_files:
        await get_storage().delete(key)

    now = utcnow()
    async with session_scope() as db:
        user = User(
            email=DEMO_EMAIL,
            username=DEMO_USERNAME,
            name=DEMO_NAME,
            password_hash=hash_password(password),
            timezone=DEMO_TIMEZONE,
            onboarding_step=OnboardingStep.DONE,
            email_digest=False,
            is_demo=True,
        )
        db.add(user)
        await db.flush()

        document = draft_to_document(profile_draft())
        profile = Profile(
            user_id=user.id,
            document=document.model_dump(mode="json"),
            version=1,
            strength=score_profile(document).score,
            source="manual",
        )
        radar = radar_settings()
        db.add(profile)
        db.add(
            Radar(
                user_id=user.id,
                settings=radar.model_dump(mode="json"),
                version=1,
                next_brief_at=next_brief_at(radar, DEMO_TIMEZONE, now),
            )
        )
        brief = Brief(
            user_id=user.id,
            local_date=local_today(DEMO_TIMEZONE),
            trigger="scheduled",
            status=BriefStatus.READY,
            stage="done",
            stats={"found": 58, "new": 16, "read": 16, "matches": 4, "below_bar": False},
            finished_at=now - timedelta(minutes=50),
        )
        db.add(brief)
        await db.flush()

        jobs = await _jobs_and_matches(db, user, brief, now)
        kits = await _kits(db, user, document, jobs)

        images = {
            name: await _store_image(db, user.id, cover(*spec)) for name, spec in COVERS.items()
        }
        gallery = {
            name: [await _store_image(db, user.id, cover(*spec)) for spec in specs]
            for name, specs in GALLERY.items()
        }
        await add_portfolio(db, user, document, images, gallery, now)

        db.add(
            Cv(
                user_id=user.id,
                template="meridian",
                accent="ink",
                options=CvOptions().model_dump(mode="json"),
                content=content_from_profile(document).model_dump(mode="json"),
                profile_version=1,
                version=0,
                status="ready",
                visibility="public",
                published_at=now - timedelta(days=12),
            )
        )
        applications = await add_tracker(db, user, jobs, kits, now)
        await db.flush()
        summary = DemoSummary(
            user_id=user.id,
            email=DEMO_EMAIL,
            password=password,
            jobs=len(jobs),
            kits=len(kits),
            applications=applications,
        )
    return summary


def main() -> None:
    init_engine()
    summary = asyncio.run(seed_demo())
    print(
        "\nDemo account ready.\n"
        f"  Sign in:    {summary.email} (or 'demo') / {summary.password}\n"
        "  App:        http://localhost:8400\n"
        f"  Portfolio:  http://localhost:8400/p/{DEMO_SLUG}\n"
        f"  CV:         http://localhost:8400/cv/{DEMO_SLUG}\n"
        f"  Seeded:     {summary.jobs} jobs, {summary.kits} kits, "
        f"{summary.applications} applications on the tracker\n"
    )


if __name__ == "__main__":
    main()
