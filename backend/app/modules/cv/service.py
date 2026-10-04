"""The CV: words from the profile, a design, AI edits, PDFs and a share link.

A CV starts as the profile's own words. AI edits run in the background (they take
a few seconds) and are truth-checked; the previous words are kept for one undo.
Your own downloads include your phone number if you choose; the shared CV never does.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.modules.auth.models import User
from app.modules.cv.content import content_from_profile
from app.modules.cv.models import Cv
from app.modules.cv.render import cv_html
from app.modules.cv.schemas import (
    CvAiRequest,
    CvOptions,
    CvOut,
    CvUpdate,
    PublicCv,
)
from app.modules.kits.checks import fact_sources
from app.modules.kits.render import to_pdf
from app.modules.kits.schemas import FactCheck, FactRef, TailoredResume
from app.modules.kits.service import sections_of
from app.modules.media.models import StoredImage
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import Profile
from app.modules.public_profile.models import PublicProfile
from app.modules.public_profile.service import PublicProfileService
from app.storage.files import get_storage

AI_EDITS_PER_DAY = 30
PDF_DOWNLOADS_PER_HOUR = 30


def cv_page_url(slug: str) -> str:
    return f"{get_settings().public_web_url.rstrip('/')}/cv/{slug}"


def _name_slug(text: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in text).strip("-")
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned[:40] or "CV"


class CvService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── loading ──────────────────────────────────────────────────────────

    async def _profile(self, user_id: uuid.UUID) -> tuple[ProfileDocument, int]:
        profile = (
            await self.db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        if profile is None:
            raise UnprocessableError("Build your profile first.", code="no_profile")
        document = ProfileDocument.model_validate(profile.document)
        if not document.experiences and not document.projects:
            raise UnprocessableError(
                "Add a role or a project to your profile first.", code="profile_too_thin"
            )
        return document, profile.version

    async def _row(self, user: User) -> Cv:
        cv = (await self.db.execute(select(Cv).where(Cv.user_id == user.id))).scalar_one_or_none()
        if cv is not None:
            return cv
        document, profile_version = await self._profile(user.id)
        cv = Cv(
            user_id=user.id,
            template="meridian",
            accent="ink",
            options=CvOptions().model_dump(mode="json"),
            content=content_from_profile(document).model_dump(mode="json"),
            profile_version=profile_version,
            version=0,
            status="ready",
            visibility="off",
        )
        self.db.add(cv)
        await self.db.flush()
        await self.db.refresh(cv)
        return cv

    async def _slug(self, user: User) -> str:
        return (await PublicProfileService(self.db)._row(user)).slug

    async def _out(self, user: User, cv: Cv) -> CvOut:
        document, profile_version = await self._profile(user.id)
        slug = await self._slug(user)
        return CvOut(
            template=cv.template,
            accent=cv.accent,
            options=CvOptions.model_validate(cv.options or {}),
            content=TailoredResume.model_validate(cv.content),
            version=cv.version,
            status=cv.status,
            stage=cv.stage,
            error=cv.error,
            last_action=cv.last_action,
            last_check=FactCheck.model_validate(cv.last_check) if cv.last_check else None,
            can_undo=cv.previous_content is not None,
            stale=profile_version > cv.profile_version,
            visibility=cv.visibility,
            slug=slug,
            url=cv_page_url(slug),
            published_at=cv.published_at,
            facts=[
                FactRef(id=f.id, text=f.text, owner=f.owner)
                for f in fact_sources(document).values()
            ],
            sections=sections_of(document),
            updated_at=cv.updated_at,
        )

    # ── owner ────────────────────────────────────────────────────────────

    async def get(self, user: User) -> CvOut:
        return await self._out(user, await self._row(user))

    def _check_version(self, cv: Cv, version: int) -> None:
        if version != cv.version:
            raise ConflictError(
                "Your CV was changed somewhere else. Reload to see the latest.",
                code="version_conflict",
                details={"current_version": cv.version},
            )

    async def update(self, user: User, data: CvUpdate) -> CvOut:
        cv = await self._row(user)
        self._check_version(cv, data.version)
        if cv.status == "working" and data.content is not None:
            raise ConflictError("Wait for the AI to finish editing your CV.", code="cv_busy")
        if data.options is not None:
            photo = data.options.photo_id
            if photo is not None:
                image = await self.db.get(StoredImage, photo)
                if image is None or image.user_id != user.id:
                    raise UnprocessableError(
                        "That photo is missing. Upload it again.", code="image_not_found"
                    )
            cv.options = data.options.model_dump(mode="json")
        if data.template is not None:
            cv.template = data.template
        if data.accent is not None:
            cv.accent = data.accent
        if data.content is not None:
            cv.content = data.content.model_dump(mode="json")
        if data.visibility is not None and data.visibility != cv.visibility:
            if cv.visibility == "off":
                cv.published_at = utcnow()
            cv.visibility = data.visibility
        cv.version += 1
        await self.db.flush()
        await self.db.refresh(cv)
        return await self._out(user, cv)

    async def reset(self, user: User, version: int) -> CvOut:
        """Start the words again from the profile (the design is kept)."""
        cv = await self._row(user)
        self._check_version(cv, version)
        document, profile_version = await self._profile(user.id)
        cv.previous_content = cv.content
        cv.content = content_from_profile(document).model_dump(mode="json")
        cv.profile_version = profile_version
        cv.last_action, cv.last_check = "Started again from your profile", None
        cv.version += 1
        await self.db.flush()
        await self.db.refresh(cv)
        return await self._out(user, cv)

    async def undo(self, user: User, version: int) -> CvOut:
        cv = await self._row(user)
        self._check_version(cv, version)
        if cv.previous_content is None:
            raise ConflictError("There's nothing to undo.", code="nothing_to_undo")
        cv.content, cv.previous_content = cv.previous_content, None
        cv.last_action, cv.last_check = "Undid the last change", None
        cv.version += 1
        await self.db.flush()
        await self.db.refresh(cv)
        return await self._out(user, cv)

    async def start_ai(self, user: User, request: CvAiRequest) -> CvOut:
        cv = await self._row(user)
        if cv.status == "working":
            return await self._out(user, cv)
        if request.action == "custom" and not (request.instruction or "").strip():
            raise UnprocessableError("Say what you'd like changed.", code="instruction_missing")
        await rate_limit.enforce(
            f"cv-ai:{user.id}",
            limit=AI_EDITS_PER_DAY,
            window_seconds=24 * 3600,
            message="That's a lot of AI edits for one day. Try again tomorrow.",
        )
        options = CvOptions.model_validate(cv.options or {})
        language = request.language or options.language
        cv.status, cv.stage, cv.error = "working", "writing", None
        await self.db.flush()
        await self.db.refresh(cv)
        out = await self._out(user, cv)
        await self.db.commit()  # the worker reads the CV in its own transaction
        from app.modules.cv.tasks import improve_cv

        await improve_cv.kiq(str(cv.id), request.action, request.instruction, language)
        return out

    async def _photo(self, options: CvOptions) -> bytes | None:
        if options.photo_id is None:
            return None
        image = await self.db.get(StoredImage, options.photo_id)
        return await get_storage().read(image.key) if image else None

    async def html(
        self, user: User, *, template: str | None = None, accent: str | None = None
    ) -> str:
        """The document for your own preview (and the template picker's thumbnails)."""
        cv = await self._row(user)
        document, _ = await self._profile(user.id)
        options = CvOptions.model_validate(cv.options or {})
        return cv_html(
            document,
            TailoredResume.model_validate(cv.content),
            options,
            template=template or cv.template,
            accent=accent or cv.accent,
            photo=await self._photo(options),
        )

    async def pdf(self, user: User) -> tuple[bytes, str]:
        await rate_limit.enforce(
            f"cv-pdf:{user.id}",
            limit=PDF_DOWNLOADS_PER_HOUR,
            window_seconds=3600,
            message="Too many downloads. Try again in a while.",
        )
        cv = await self._row(user)
        document, _ = await self._profile(user.id)
        options = CvOptions.model_validate(cv.options or {})
        pdf = await to_pdf(await self.html(user), paper=options.paper)
        name = _name_slug(document.basics.full_name or "CV")
        return pdf, f"{name}-CV.pdf"

    # ── visitors ─────────────────────────────────────────────────────────

    async def shared(self, slug: str) -> tuple[Cv, ProfileDocument] | None:
        identity = (
            await self.db.execute(select(PublicProfile).where(PublicProfile.slug == slug.lower()))
        ).scalar_one_or_none()
        if identity is None:
            return None
        cv = (
            await self.db.execute(select(Cv).where(Cv.user_id == identity.user_id))
        ).scalar_one_or_none()
        owner = await self.db.get(User, identity.user_id)
        if cv is None or cv.visibility == "off" or owner is None or not owner.is_active:
            return None
        try:
            document, _ = await self._profile(identity.user_id)
        except UnprocessableError:
            return None
        return cv, document

    async def _shared_or_404(self, slug: str) -> tuple[Cv, ProfileDocument]:
        found = await self.shared(slug)
        if found is None:
            raise NotFoundError("This CV isn't available.")
        return found

    async def public_html(self, slug: str) -> str:
        cv, document = await self._shared_or_404(slug)
        options = CvOptions.model_validate(cv.options or {})
        return cv_html(
            document,
            TailoredResume.model_validate(cv.content),
            options,
            template=cv.template,
            accent=cv.accent,
            photo=await self._photo(options),
            public=True,
        )

    async def public_pdf(self, slug: str, ip: str) -> tuple[bytes, str]:
        await rate_limit.enforce(
            f"public-cv-pdf:{ip}",
            limit=PDF_DOWNLOADS_PER_HOUR,
            window_seconds=3600,
            message="Too many downloads. Try again in a while.",
        )
        cv, document = await self._shared_or_404(slug)
        options = CvOptions.model_validate(cv.options or {})
        pdf = await to_pdf(await self.public_html(slug), paper=options.paper)
        return pdf, f"{_name_slug(document.basics.full_name or 'CV')}-CV.pdf"

    async def public_meta(self, slug: str) -> tuple[Cv, PublicCv, ProfileDocument] | None:
        found = await self.shared(slug)
        if found is None:
            return None
        cv, document = found
        options = CvOptions.model_validate(cv.options or {})
        content = TailoredResume.model_validate(cv.content)
        return (
            cv,
            PublicCv(
                slug=slug.lower(),
                url=cv_page_url(slug.lower()),
                name=document.basics.full_name or "",
                headline=content.headline or document.basics.headline,
                document_url=f"/api/v1/public/cv/{slug.lower()}/document.html",
                pdf_url=f"/api/v1/public/cv/{slug.lower()}/cv.pdf",
                paper=options.paper,
                template=cv.template,
            ),
            document,
        )
