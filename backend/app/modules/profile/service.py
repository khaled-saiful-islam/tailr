"""Profile Builder: the career record, CV import, strength and the Bullet Coach."""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Callable, Hashable, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import get_ai
from app.core import rate_limit
from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.modules.auth.models import OnboardingStep, User
from app.modules.profile import prompts
from app.modules.profile.document import (
    Experience,
    ProfileDocument,
)
from app.modules.profile.extraction import detect_kind
from app.modules.profile.models import CvImport, ImportStatus, Profile
from app.modules.profile.repository import ImportRepository, ProfileRepository
from app.modules.profile.schemas import (
    BulletIssueOut,
    CoachAnswer,
    CoachBulletOut,
    CoachBulletRequest,
    ImportOut,
    ImportStats,
    ProfileOut,
    ProfileUpdate,
    StrengthCheckOut,
    StrengthOut,
    SummaryAnswer,
    SummaryOut,
)
from app.modules.profile.strength import Strength, score_profile
from app.storage.files import get_storage

IMPORTS_PER_HOUR = 12
COACH_PER_HOUR = 60


def strength_out(strength: Strength) -> StrengthOut:
    return StrengthOut(
        score=strength.score,
        checks=[StrengthCheckOut(**check.__dict__) for check in strength.checks],
        bullet_issues=[
            BulletIssueOut(bullet_id=issue.bullet_id, issues=list(issue.issues))
            for issue in strength.bullet_issues
        ],
    )


def import_stats(document: ProfileDocument) -> ImportStats:
    return ImportStats(
        experiences=len(document.experiences),
        achievements=sum(len(e.bullets) for e in document.experiences)
        + sum(len(p.bullets) for p in document.projects),
        skills=len(document.skills),
        education=len(document.education),
        projects=len(document.projects),
    )


def import_out(item: CvImport, *, with_draft: bool = True) -> ImportOut:
    draft = ProfileDocument.model_validate(item.draft) if item.draft and with_draft else None
    return ImportOut(
        id=item.id,
        status=item.status,
        filename=item.filename,
        file_kind=item.file_kind,
        error=item.error,
        used_vision=item.used_vision,
        created_at=item.created_at,
        updated_at=item.updated_at,
        draft=draft,
        stats=import_stats(draft) if draft else None,
    )


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.profiles = ProfileRepository(db)
        self.imports = ImportRepository(db)

    # ── the profile ──────────────────────────────────────────────────────

    async def get(self, user: User) -> ProfileOut:
        profile = await self.profiles.for_user(user.id)
        document = (
            ProfileDocument.model_validate(profile.document) if profile else ProfileDocument()
        )
        if profile is None and not document.basics.email:
            # Start new profiles with what we already know.
            document.basics.full_name = user.name
            document.basics.email = user.email
        return ProfileOut(
            exists=profile is not None,
            document=document,
            version=profile.version if profile else 0,
            strength=strength_out(score_profile(document)),
            updated_at=profile.updated_at if profile else None,
        )

    async def document_for(self, user_id: uuid.UUID) -> ProfileDocument | None:
        """The stored document, for other modules (radar, matching, kits)."""
        profile = await self.profiles.for_user(user_id)
        return ProfileDocument.model_validate(profile.document) if profile else None

    async def save(
        self, user: User, update: ProfileUpdate, *, source: str = "manual"
    ) -> ProfileOut:
        profile = await self.profiles.for_user(user.id, lock=True)
        current_version = profile.version if profile else 0
        if update.version != current_version:
            raise ConflictError(
                "Your profile was changed somewhere else. Reload to see the latest version.",
                code="version_conflict",
                details={"current_version": current_version},
            )
        await self._store(user, profile, update.document, source=source)
        return await self.get(user)

    async def _store(
        self, user: User, profile: Profile | None, document: ProfileDocument, *, source: str
    ) -> Profile:
        payload = document.model_dump(mode="json")
        strength = score_profile(document).score
        if profile is None:
            profile = await self.profiles.add(
                Profile(
                    user_id=user.id, document=payload, version=1, strength=strength, source=source
                )
            )
        else:
            profile.document = payload
            profile.version += 1
            profile.strength = strength
            await self.db.flush()
        if not document.is_empty and user.onboarding_step in {
            OnboardingStep.IMPORT,
            OnboardingStep.REVIEW,
        }:
            user.onboarding_step = OnboardingStep.RADAR
        return profile

    # ── CV import ────────────────────────────────────────────────────────

    async def start_import(self, user: User, data: bytes, filename: str) -> ImportOut:
        settings = get_settings()
        if not data:
            raise UnprocessableError("That file is empty.", code="bad_file")
        if len(data) > settings.upload_max_bytes:
            raise UnprocessableError(
                f"That file is larger than {settings.upload_max_mb} MB.", code="file_too_large"
            )
        await rate_limit.enforce(
            f"cv-import:{user.id}",
            limit=IMPORTS_PER_HOUR,
            window_seconds=3600,
            message="You've uploaded a lot of CVs this hour. Try again later.",
        )
        kind = detect_kind(data, filename)
        key = await get_storage().save(data, folder="cv", suffix=kind.value)
        item = await self.imports.add(
            CvImport(
                user_id=user.id,
                filename=(filename or "cv")[:255],
                file_kind=kind.value,
                file_key=key,
                size_bytes=len(data),
                sha256=hashlib.sha256(data).hexdigest(),
                status=ImportStatus.QUEUED,
            )
        )
        if user.onboarding_step == OnboardingStep.IMPORT:
            user.onboarding_step = OnboardingStep.REVIEW
        # Commit before queueing so the worker always finds the row.
        await self.db.commit()
        from app.modules.profile.tasks import process_import

        await process_import.kiq(str(item.id))
        return import_out(item)

    async def get_import(self, user: User, import_id: uuid.UUID) -> ImportOut:
        item = await self.imports.get_for_user(import_id, user.id)
        if item is None:
            raise NotFoundError("We couldn't find that upload.")
        return import_out(item)

    async def apply_import(self, user: User, import_id: uuid.UUID, mode: str) -> ProfileOut:
        item = await self.imports.get_for_user(import_id, user.id)
        if item is None:
            raise NotFoundError("We couldn't find that upload.")
        if item.status != ImportStatus.READY or not item.draft:
            raise ConflictError("This upload isn't ready to use.", code="import_not_ready")
        draft = ProfileDocument.model_validate(item.draft)
        profile = await self.profiles.for_user(user.id, lock=True)
        current = ProfileDocument.model_validate(profile.document) if profile else None
        document = merge_documents(current, draft) if mode == "merge" and current else draft
        if not document.basics.email:
            document.basics.email = user.email
        await self._store(user, profile, document, source="import")
        item.status = ImportStatus.APPLIED
        return await self.get(user)

    # ── coaching ─────────────────────────────────────────────────────────

    async def coach_bullet(self, user: User, request: CoachBulletRequest) -> CoachBulletOut:
        await self._limit_coach(user)
        context = " at ".join(part for part in (request.title, request.company) if part)
        answer = await get_ai().structured(
            [
                {"role": "system", "content": prompts.COACH_SYSTEM},
                {
                    "role": "user",
                    "content": (f"Role: {context}\n" if context else "")
                    + f"Achievement line:\n{request.text}",
                },
            ],
            CoachAnswer,
            purpose="profile.coach",
            user_id=user.id,
            temperature=0.5,
            max_tokens=600,
        )
        return CoachBulletOut(
            suggestion=answer.suggestion.strip(),
            reason=answer.reason.strip(),
            questions=[q.strip() for q in answer.questions if q.strip()][:3],
        )

    async def write_summary(self, user: User) -> SummaryOut:
        await self._limit_coach(user)
        document = await self.document_for(user.id)
        if document is None or not document.experiences:
            raise UnprocessableError(
                "Add at least one role first, so the summary has something to say.",
                code="profile_too_thin",
            )
        answer = await get_ai().structured(
            [
                {"role": "system", "content": prompts.SUMMARY_SYSTEM},
                {"role": "user", "content": profile_as_text(document)},
            ],
            SummaryAnswer,
            purpose="profile.summary",
            user_id=user.id,
            temperature=0.6,
            max_tokens=500,
        )
        return SummaryOut(summary=answer.summary.strip())

    async def _limit_coach(self, user: User) -> None:
        await rate_limit.enforce(
            f"coach:{user.id}",
            limit=COACH_PER_HOUR,
            window_seconds=3600,
            message="That's a lot of coaching for one hour. Take a break and try again soon.",
        )


# ── pure helpers ─────────────────────────────────────────────────────────


def profile_as_text(document: ProfileDocument) -> str:
    """A compact, readable rendering of the profile for prompts."""
    b = document.basics
    lines = [
        f"Name: {b.full_name or ''}",
        f"Headline: {b.headline or ''}",
        f"Location: {b.location or ''}",
    ]
    for e in document.experiences:
        start = f"{e.start.year}" if e.start else "?"
        end = "present" if e.current else (f"{e.end.year}" if e.end else "?")
        lines.append(f"\nRole: {e.title} at {e.company} ({start} to {end})")
        lines += [f"- {bullet.text}" for bullet in e.bullets]
    if document.projects:
        lines.append("\nProjects:")
        lines += [f"- {p.name}: {p.summary or ''}" for p in document.projects]
    if document.education:
        lines.append("\nEducation:")
        lines += [
            f"- {ed.qualification or ''} {ed.field or ''}, {ed.institution}"
            for ed in document.education
        ]
    if document.skills:
        lines.append("\nSkills: " + ", ".join(s.name for s in document.skills))
    return "\n".join(lines)


def _merge_list[T](
    current: Sequence[T], incoming: Sequence[T], key: Callable[[T], Hashable]
) -> list[T]:
    seen = {key(item) for item in current}
    return [*current, *(item for item in incoming if key(item) not in seen)]


def merge_documents(current: ProfileDocument, incoming: ProfileDocument) -> ProfileDocument:
    """Add what the new CV has that the profile doesn't; never overwrite the user's edits."""
    merged = current.model_copy(deep=True)
    basics, new = merged.basics, incoming.basics
    for field in ("full_name", "headline", "email", "phone", "location", "summary"):
        if not getattr(basics, field) and getattr(new, field):
            setattr(basics, field, getattr(new, field))
    basics.links = _merge_list(
        basics.links, new.links, lambda link: link.url.casefold().rstrip("/")
    )

    by_role = {(e.company.casefold(), e.title.casefold()): e for e in merged.experiences}
    for experience in incoming.experiences:
        existing = by_role.get((experience.company.casefold(), experience.title.casefold()))
        if existing is None:
            merged.experiences.append(experience)
            continue
        existing.bullets = _merge_list(
            existing.bullets, experience.bullets, lambda b: b.text.casefold()
        )
        existing.start = existing.start or experience.start
        existing.end = existing.end or experience.end
    merged.experiences.sort(key=_experience_order, reverse=True)

    merged.education = _merge_list(
        merged.education,
        incoming.education,
        lambda e: (e.institution.casefold(), (e.qualification or "").casefold()),
    )
    merged.projects = _merge_list(merged.projects, incoming.projects, lambda p: p.name.casefold())
    merged.skills = _merge_list(merged.skills, incoming.skills, lambda s: s.name.casefold())
    merged.certifications = _merge_list(
        merged.certifications, incoming.certifications, lambda c: c.name.casefold()
    )
    merged.languages = _merge_list(
        merged.languages, incoming.languages, lambda lang: lang.name.casefold()
    )
    return ProfileDocument.model_validate(merged.model_dump())


def _experience_order(experience: Experience) -> tuple[int, int, int]:
    start = experience.start
    return (
        1 if experience.current else 0,
        start.year if start else 0,
        (start.month or 0) if start else 0,
    )
