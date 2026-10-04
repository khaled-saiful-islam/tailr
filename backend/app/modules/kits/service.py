"""Apply Kits: create, read, edit, regenerate, and export to HTML/PDF."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.modules.auth.models import User
from app.modules.brief.models import Match, MatchStatus
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.kits.checks import fact_sources, keyword_report
from app.modules.kits.models import Kit
from app.modules.kits.render import JobInfo, letter_html, resume_html, to_pdf
from app.modules.kits.schemas import (
    CoverLetter,
    FactCheck,
    FactRef,
    KeywordReport,
    KitCreate,
    KitExtras,
    KitOut,
    KitRegenerate,
    KitSummaryOut,
    KitUpdate,
    SectionRef,
    TailoredResume,
)
from app.modules.matching.signals import profile_signals
from app.modules.profile.document import ProfileDocument
from app.modules.profile.service import ProfileService

KITS_PER_DAY = 20


def _slug(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")[:40] or "Tailr"


def sections_of(document: ProfileDocument) -> list[SectionRef]:
    roles = [
        SectionRef(id=role.id, kind="role", label=f"{role.title} at {role.company}")
        for role in document.experiences
    ]
    projects = [
        SectionRef(id=project.id, kind="project", label=project.name)
        for project in document.projects
    ]
    return roles + projects


class KitService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _document(self, user: User) -> ProfileDocument:
        document = await ProfileService(self.db).document_for(user.id)
        if document is None or not document.experiences:
            raise UnprocessableError(
                "Add at least one role to your profile before tailoring.", code="profile_too_thin"
            )
        return document

    async def _out(self, kit: Kit) -> KitOut:
        job = await self.db.get(Job, kit.job_id)
        match = await self.db.get(Match, kit.match_id) if kit.match_id else None
        document = await ProfileService(self.db).document_for(kit.user_id)
        facts = (
            [FactRef(id=f.id, text=f.text, owner=f.owner) for f in fact_sources(document).values()]
            if document
            else []
        )
        sections = sections_of(document) if document else []
        assert job is not None
        return KitOut(
            id=kit.id,
            match_id=kit.match_id,
            job_id=kit.job_id,
            job_title=job.title,
            company=job.company,
            job_url=job.url,
            score=match.score if match else None,
            status=kit.status,
            stage=kit.stage,
            error=kit.error,
            language=kit.language,
            tone=kit.tone,
            version=kit.version,
            resume=TailoredResume.model_validate(kit.resume) if kit.resume else None,
            cover_letter=CoverLetter.model_validate(kit.cover_letter) if kit.cover_letter else None,
            extras=KitExtras.model_validate(kit.extras) if kit.extras else None,
            fact_check=FactCheck.model_validate(kit.fact_check) if kit.fact_check else None,
            keywords=KeywordReport.model_validate(kit.keywords) if kit.keywords else None,
            facts=facts,
            sections=sections,
            candidate_name=document.basics.full_name if document else None,
            created_at=kit.created_at,
            updated_at=kit.updated_at,
        )

    async def _own(self, user: User, kit_id: uuid.UUID) -> Kit:
        kit = await self.db.get(Kit, kit_id)
        if kit is None or kit.user_id != user.id:
            raise NotFoundError("We couldn't find that application kit.")
        return kit

    async def _start(self, kit: Kit) -> None:
        await self.db.commit()  # the worker reads the kit in its own transaction
        from app.modules.kits.tasks import build_kit

        await build_kit.kiq(str(kit.id))

    async def create(self, user: User, data: KitCreate) -> KitOut:
        match = await self.db.get(Match, data.match_id)
        if match is None or match.user_id != user.id:
            raise NotFoundError("We couldn't find that job.")
        await self._document(user)
        existing = (
            await self.db.execute(
                select(Kit).where(Kit.user_id == user.id, Kit.job_id == match.job_id)
            )
        ).scalar_one_or_none()
        if existing is not None and existing.status in {"building", "ready"}:
            return await self._out(existing)
        await rate_limit.enforce(
            f"kits:{user.id}",
            limit=KITS_PER_DAY,
            window_seconds=24 * 3600,
            message="You've tailored a lot of applications today. Try again tomorrow.",
        )
        kit = existing or Kit(user_id=user.id, job_id=match.job_id, match_id=match.id)
        kit.status, kit.stage, kit.error = "building", "reading", None
        kit.language, kit.tone = data.language, data.tone
        if existing is None:
            self.db.add(kit)
        if match.status in {MatchStatus.NEW, MatchStatus.SEEN}:
            match.status = MatchStatus.SAVED
        await self.db.flush()
        await self.db.refresh(kit)
        out = await self._out(kit)
        await self._start(kit)
        return out

    async def regenerate(self, user: User, kit_id: uuid.UUID, data: KitRegenerate) -> KitOut:
        kit = await self._own(user, kit_id)
        if kit.status == "building":
            return await self._out(kit)
        await rate_limit.enforce(
            f"kits:{user.id}",
            limit=KITS_PER_DAY,
            window_seconds=24 * 3600,
            message="You've tailored a lot of applications today. Try again tomorrow.",
        )
        kit.language = data.language or kit.language
        kit.tone = data.tone or kit.tone
        kit.status, kit.stage, kit.error = "building", "reading", None
        await self.db.flush()
        await self.db.refresh(kit)
        out = await self._out(kit)
        await self._start(kit)
        return out

    async def get(self, user: User, kit_id: uuid.UUID) -> KitOut:
        return await self._out(await self._own(user, kit_id))

    async def for_match(self, user: User, match_id: uuid.UUID) -> KitOut | None:
        kit = (
            await self.db.execute(
                select(Kit).where(Kit.user_id == user.id, Kit.match_id == match_id)
            )
        ).scalar_one_or_none()
        return await self._out(kit) if kit is not None else None

    async def list(self, user: User) -> list[KitSummaryOut]:
        rows = (
            await self.db.execute(
                select(Kit, Job)
                .join(Job, Job.id == Kit.job_id)
                .where(Kit.user_id == user.id)
                .order_by(Kit.updated_at.desc())
            )
        ).all()
        return [
            KitSummaryOut(
                id=kit.id,
                match_id=kit.match_id,
                job_title=job.title,
                company=job.company,
                status=kit.status,
                language=kit.language,
                updated_at=kit.updated_at,
            )
            for kit, job in rows
        ]

    async def update(self, user: User, kit_id: uuid.UUID, data: KitUpdate) -> KitOut:
        """Save your own edits. You're the author now: edits are kept as you write them."""
        kit = await self._own(user, kit_id)
        if kit.status != "ready":
            raise ConflictError("This kit is still being prepared.", code="kit_not_ready")
        if data.version != kit.version:
            raise ConflictError(
                "This kit was changed somewhere else. Reload to see the latest.",
                code="version_conflict",
                details={"current_version": kit.version},
            )
        if data.resume is not None:
            kit.resume = data.resume.model_dump(mode="json")
            job = await self.db.get(Job, kit.job_id)
            document = await self._document(user)
            if job and job.insights:
                insights = JobInsights.model_validate(job.insights)
                kit.keywords = keyword_report(
                    insights.required_skills + insights.nice_skills,
                    profile_signals(document).text,
                    data.resume,
                    document,
                ).model_dump(mode="json")
        if data.cover_letter is not None:
            kit.cover_letter = data.cover_letter.model_dump(mode="json")
        kit.version += 1
        await self.db.flush()
        await self.db.refresh(kit)
        return await self._out(kit)

    # ── documents ────────────────────────────────────────────────────────

    async def resume_html(self, user: User, kit_id: uuid.UUID) -> str:
        kit = await self._own(user, kit_id)
        if not kit.resume:
            raise ConflictError("This kit is still being prepared.", code="kit_not_ready")
        return resume_html(
            await self._document(user), TailoredResume.model_validate(kit.resume), kit.language
        )

    async def letter_html(self, user: User, kit_id: uuid.UUID) -> str:
        kit = await self._own(user, kit_id)
        job = await self.db.get(Job, kit.job_id)
        if not kit.cover_letter or job is None:
            raise ConflictError("This kit is still being prepared.", code="kit_not_ready")
        return letter_html(
            await self._document(user),
            CoverLetter.model_validate(kit.cover_letter),
            JobInfo(title=job.title, company=job.company),
            kit.language,
        )

    async def pdf(self, user: User, kit_id: uuid.UUID, which: str) -> tuple[bytes, str]:
        kit = await self._own(user, kit_id)
        job = await self.db.get(Job, kit.job_id)
        html = await (
            self.resume_html(user, kit_id) if which == "resume" else self.letter_html(user, kit_id)
        )
        document = await self._document(user)
        name = _slug(document.basics.full_name or "Resume")
        label = "Resume" if which == "resume" else "Cover-Letter"
        company = _slug(job.company) if job else "Job"
        return await to_pdf(html), f"{name}-{label}-{company}.pdf"
