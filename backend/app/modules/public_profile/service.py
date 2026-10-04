"""Public pages: the owner's settings, and what visitors can reach.

A page shows only when its visibility isn't "off" and the profile has a name and a
role or project. Everything a visitor sees is assembled fresh from the profile, so an
edit to the profile shows up on the page at once.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.kits.checks import fact_sources
from app.modules.kits.render import to_pdf
from app.modules.media.models import StoredImage
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import Profile
from app.modules.public_profile import og
from app.modules.public_profile.assemble import build_page, missing_for, page_url
from app.modules.public_profile.cv import public_cv_html
from app.modules.public_profile.highlights import is_truthful, suggest_highlights
from app.modules.public_profile.models import PublicProfile, PublicProfileViews
from app.modules.public_profile.schemas import (
    ContactOut,
    Highlight,
    PageSettings,
    PublicPage,
    PublicProfileOut,
    PublicProfileUpdate,
    SlugCheckOut,
    ViewDay,
    ViewStats,
)
from app.modules.public_profile.slugs import normalise, slug_problem, slugify
from app.storage.files import get_storage

log = get_logger(__name__)

SLUG_CHANGES_PER_DAY = 10
CONTACT_REVEALS_PER_HOUR = 20
CV_DOWNLOADS_PER_HOUR = 30
STATS_DAYS = 30


def _not_available() -> NotFoundError:
    return NotFoundError("This page isn't available.")


class PublicProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── shared ───────────────────────────────────────────────────────────

    async def _profile(self, user_id: uuid.UUID) -> tuple[ProfileDocument | None, datetime]:
        profile = (
            await self.db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        if profile is None:
            return None, utcnow()
        return ProfileDocument.model_validate(profile.document), profile.updated_at

    async def _images(self, user_id: uuid.UUID) -> dict[uuid.UUID, StoredImage]:
        rows = (
            await self.db.execute(select(StoredImage).where(StoredImage.user_id == user_id))
        ).scalars()
        return {image.id: image for image in rows}

    async def _page(
        self, row: PublicProfile, document: ProfileDocument, updated: datetime
    ) -> PublicPage:
        return build_page(
            row,
            document,
            await self._images(row.user_id),
            base_url=get_settings().public_web_url,
            updated_at=max(updated, row.updated_at) if row.updated_at else updated,
        )

    # ── owner ────────────────────────────────────────────────────────────

    async def _slug_taken(self, slug: str, user_id: uuid.UUID) -> bool:
        owner = await self.db.scalar(
            select(PublicProfile.user_id).where(PublicProfile.slug == slug)
        )
        return owner is not None and owner != user_id

    async def _unique_slug(self, base: str, user_id: uuid.UUID) -> str:
        if not await self._slug_taken(base, user_id):
            return base
        for suffix in range(2, 100):
            candidate = f"{base[:36]}-{suffix}"
            if not await self._slug_taken(candidate, user_id):
                return candidate
        return f"{base[:30]}-{uuid.uuid4().hex[:8]}"

    async def _row(self, user: User) -> PublicProfile:
        row = (
            await self.db.execute(select(PublicProfile).where(PublicProfile.user_id == user.id))
        ).scalar_one_or_none()
        if row is not None:
            return row
        document, _ = await self._profile(user.id)
        name = (document.basics.full_name if document else None) or user.name or "me"
        row = PublicProfile(
            user_id=user.id,
            slug=await self._unique_slug(slugify(name), user.id),
            visibility="off",
            template="blueprint",
            appearance="auto",
            settings=PageSettings().model_dump(mode="json"),
            version=0,
        )
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def _stats(self, row: PublicProfile) -> ViewStats:
        since = utcnow().date() - timedelta(days=STATS_DAYS - 1)
        rows = (
            await self.db.execute(
                select(PublicProfileViews)
                .where(PublicProfileViews.profile_id == row.id, PublicProfileViews.day >= since)
                .order_by(PublicProfileViews.day)
            )
        ).scalars()
        days: list[ViewDay] = []
        sources: dict[str, int] = {}
        for day in rows:
            days.append(ViewDay(day=day.day, views=day.views))
            for source, count in (day.sources or {}).items():
                sources[source] = sources.get(source, 0) + int(count)
        return ViewStats(last_30_days=sum(d.views for d in days), days=days, sources=sources)

    async def _out(self, row: PublicProfile) -> PublicProfileOut:
        document, _ = await self._profile(row.user_id)
        return PublicProfileOut(
            slug=row.slug,
            url=page_url(get_settings().public_web_url, row.slug),
            visibility=row.visibility,
            template=row.template,
            appearance=row.appearance,
            settings=PageSettings.model_validate(row.settings or {}),
            version=row.version,
            published_at=row.published_at,
            stats=await self._stats(row),
            missing=missing_for(document),
        )

    async def get(self, user: User) -> PublicProfileOut:
        return await self._out(await self._row(user))

    async def check_slug(self, user: User, value: str) -> SlugCheckOut:
        slug = normalise(value)
        problem = slug_problem(slug)
        if problem is None and await self._slug_taken(slug, user.id):
            problem = "Someone already has that address."
        return SlugCheckOut(slug=slug, available=problem is None, reason=problem)

    async def _check_images(self, user: User, settings: PageSettings) -> None:
        wanted = {settings.photo_id, *settings.project_images.values()} - {None}
        if not wanted:
            return
        owned = set(
            (
                await self.db.execute(
                    select(StoredImage.id).where(
                        StoredImage.user_id == user.id, StoredImage.id.in_(wanted)
                    )
                )
            ).scalars()
        )
        if wanted - owned:
            raise UnprocessableError(
                "One of the pictures is missing. Upload it again.", code="image_not_found"
            )

    def _check_highlights(self, settings: PageSettings, document: ProfileDocument | None) -> None:
        sources = fact_sources(document) if document else {}
        for highlight in settings.highlights:
            if not is_truthful(highlight, sources):
                raise UnprocessableError(
                    f'"{highlight.value} {highlight.label}" doesn\'t match a fact in your '
                    "profile. Highlights must use numbers from your profile.",
                    code="highlight_not_in_profile",
                )

    async def update(self, user: User, data: PublicProfileUpdate) -> PublicProfileOut:
        row = await self._row(user)
        if data.version != row.version:
            raise ConflictError(
                "Your page settings were changed somewhere else. Reload to see the latest.",
                code="version_conflict",
                details={"current_version": row.version},
            )
        document, _ = await self._profile(user.id)
        if data.slug is not None and normalise(data.slug) != row.slug:
            check = await self.check_slug(user, data.slug)
            if not check.available:
                code = "slug_taken" if "already" in (check.reason or "") else "slug_invalid"
                raise (ConflictError if code == "slug_taken" else UnprocessableError)(
                    check.reason or "That address can't be used.", code=code
                )
            await rate_limit.enforce(
                f"slug-change:{user.id}",
                limit=SLUG_CHANGES_PER_DAY,
                window_seconds=24 * 3600,
                message="You've changed your address a lot today. Try again tomorrow.",
            )
            row.slug = check.slug
        if data.settings is not None:
            await self._check_images(user, data.settings)
            self._check_highlights(data.settings, document)
            row.settings = data.settings.model_dump(mode="json")
        if data.template is not None:
            row.template = data.template
        if data.appearance is not None:
            row.appearance = data.appearance
        if data.visibility is not None and data.visibility != row.visibility:
            if data.visibility != "off" and (missing := missing_for(document)):
                raise UnprocessableError(
                    f"Add {' and '.join(missing)} to your profile before publishing.",
                    code="profile_incomplete",
                )
            if row.visibility == "off":
                row.published_at = utcnow()
            row.visibility = data.visibility
        row.version += 1
        await self.db.flush()
        await self.db.refresh(row)
        return await self._out(row)

    async def preview(self, user: User) -> PublicPage:
        """The page exactly as visitors would see it, whether or not it's published."""
        row = await self._row(user)
        document, updated = await self._profile(user.id)
        if document is None:
            raise UnprocessableError("Build your profile first.", code="no_profile")
        return await self._page(row, document, updated)

    async def suggest_highlights(self, user: User) -> list[Highlight]:
        document, _ = await self._profile(user.id)
        if document is None:
            raise UnprocessableError("Build your profile first.", code="no_profile")
        return await suggest_highlights(document, user.id)

    # ── visitors ─────────────────────────────────────────────────────────

    async def published(self, slug: str) -> tuple[PublicProfile, PublicPage] | None:
        row = (
            await self.db.execute(
                select(PublicProfile).where(PublicProfile.slug == normalise(slug))
            )
        ).scalar_one_or_none()
        if row is None or row.visibility == "off":
            return None
        document, updated = await self._profile(row.user_id)
        if document is None or missing_for(document):
            return None
        owner = await self.db.get(User, row.user_id)
        if owner is None or not owner.is_active:
            return None
        return row, await self._page(row, document, updated)

    async def _published_or_404(self, slug: str) -> tuple[PublicProfile, PublicPage]:
        found = await self.published(slug)
        if found is None:
            raise _not_available()
        return found

    async def contact(self, slug: str, ip: str) -> ContactOut:
        row, _ = await self._published_or_404(slug)
        settings = PageSettings.model_validate(row.settings or {})
        if settings.contact_email is None:
            raise NotFoundError("This person hasn't added a contact email.")
        await rate_limit.enforce(
            f"contact-reveal:{ip}",
            limit=CONTACT_REVEALS_PER_HOUR,
            window_seconds=3600,
            message="Too many requests. Try again in a while.",
        )
        return ContactOut(email=str(settings.contact_email))

    def og_url(self, page: PublicPage) -> str:
        version = og.inputs_hash(page)[:12]
        base = get_settings().public_web_url.rstrip("/")
        return f"{base}/api/v1/public/profiles/{page.slug}/og.jpg?v={version}"

    async def og_image(self, slug: str) -> bytes:
        row, page = await self._published_or_404(slug)
        wanted = og.inputs_hash(page)
        storage = get_storage()
        if row.og_key and row.og_hash == wanted:
            try:
                return await storage.read(row.og_key)
            except NotFoundError:
                log.info("og_image_missing", slug=slug)
        settings = PageSettings.model_validate(row.settings or {})
        photo = None
        if settings.photo_id and (image := await self.db.get(StoredImage, settings.photo_id)):
            photo = await storage.read(image.key)
        data = await og.render_og(page, photo)
        old = row.og_key
        row.og_key = await storage.save(data, folder="og", suffix="jpg")
        row.og_hash = wanted
        await self.db.flush()
        if old:
            await storage.delete(old)
        return data

    async def cv(self, slug: str, ip: str) -> tuple[bytes, str]:
        row, _ = await self._published_or_404(slug)
        await rate_limit.enforce(
            f"public-cv:{ip}",
            limit=CV_DOWNLOADS_PER_HOUR,
            window_seconds=3600,
            message="Too many downloads. Try again in a while.",
        )
        document, _ = await self._profile(row.user_id)
        assert document is not None
        settings = PageSettings.model_validate(row.settings or {})
        pdf = await to_pdf(public_cv_html(document, settings))
        return pdf, f"{row.slug}-CV.pdf"

    async def is_owner(self, row: PublicProfile, user_id: uuid.UUID | None) -> bool:
        return user_id is not None and row.user_id == user_id
