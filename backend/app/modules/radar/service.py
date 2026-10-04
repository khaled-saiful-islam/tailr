"""Job Radar: what to search for, a live preview of what that catches, and when to brief."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import get_ai
from app.core import rate_limit
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import ConflictError, UnprocessableError
from app.modules.auth.models import OnboardingStep, User
from app.modules.profile.document import ProfileDocument
from app.modules.profile.service import ProfileService, profile_as_text
from app.modules.radar import prompts
from app.modules.radar.filters import apply_filters, infer_seniority
from app.modules.radar.locations import BY_KEY, PLACES, guess_place
from app.modules.radar.models import Radar
from app.modules.radar.relevance import relevant_titles
from app.modules.radar.schedule import next_brief_at
from app.modules.radar.schemas import (
    PlaceOut,
    PreviewJobOut,
    PreviewOut,
    PreviewSourceOut,
    RadarOptionsOut,
    RadarOut,
    RadarUpdate,
    RoleIdeas,
    RoleSuggestionOut,
    SourceOptionOut,
    SuggestionsOut,
)
from app.modules.radar.settings import RadarSettings
from app.modules.sources import registry
from app.modules.sources.base import JobCard, SearchQuery
from app.modules.sources.service import search_many

PREVIEWS_PER_HOUR = 40
SUGGESTIONS_PER_HOUR = 20
PREVIEW_PER_QUERY = 20
SAMPLE_SIZE = 6


def build_queries(settings: RadarSettings, *, limit: int | None = None) -> list[SearchQuery]:
    """One search per role. A single chosen state narrows the search; otherwise all of Malaysia."""
    location = "Malaysia"
    if not settings.anywhere and len(settings.places) == 1:
        location = BY_KEY[settings.places[0]].search_name
    max_queries = get_settings().brief_max_queries
    return [
        SearchQuery(
            keywords=role,
            location=location,
            freshness_days=settings.freshness_days,
            limit=limit or 25,
        )
        for role in settings.roles[:max_queries]
    ]


def defaults_from_profile(document: ProfileDocument | None) -> RadarSettings:
    """A sensible first radar: your latest title, your city, any level near yours."""
    if document is None:
        return RadarSettings()
    roles: list[str] = []
    if document.experiences:
        roles.append(document.experiences[0].title)
    if document.basics.headline and len(document.basics.headline) <= 60:
        roles.append(document.basics.headline)
    place = guess_place(document.basics.location)
    level = infer_seniority(document.experiences[0].title) if document.experiences else None
    return RadarSettings(
        roles=[_strip_level(role) for role in roles],
        anywhere=place is None,
        places=[place] if place else [],
        seniority=[level] if level else [],
    )


def _strip_level(title: str) -> str:
    words = [
        w
        for w in title.split()
        if w.lower().strip(".") not in {"senior", "sr", "snr", "junior", "jr", "lead"}
    ]
    return " ".join(words) or title


def _card_out(card: JobCard) -> PreviewJobOut:
    return PreviewJobOut(
        source=card.source,
        title=card.title,
        company=card.company,
        location=card.location,
        url=card.url,
        posted_at=card.posted_at,
        posted_text=card.posted_text,
        salary_text=card.salary_text,
        work_mode=card.work_mode,
    )


class RadarService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def options() -> RadarOptionsOut:
        return RadarOptionsOut(
            places=[PlaceOut(key=p.key, label=p.label) for p in PLACES],
            sources=[
                SourceOptionOut(key=s.key, label=s.label, available=s.available, note=s.note)
                for s in registry.catalog()
            ],
        )

    async def _radar(self, user_id: uuid.UUID, *, lock: bool = False) -> Radar | None:
        stmt = select(Radar).where(Radar.user_id == user_id)
        if lock:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def settings_for(self, user_id: uuid.UUID) -> RadarSettings | None:
        radar = await self._radar(user_id)
        return RadarSettings.model_validate(radar.settings) if radar else None

    def _out(self, user: User, radar: Radar | None, settings: RadarSettings) -> RadarOut:
        return RadarOut(
            exists=radar is not None,
            settings=settings,
            version=radar.version if radar else 0,
            next_brief_at=(
                radar.next_brief_at if radar else next_brief_at(settings, user.timezone)
            ),
            searches=[query.keywords for query in build_queries(settings)],
            updated_at=radar.updated_at if radar else None,
        )

    async def get(self, user: User) -> RadarOut:
        radar = await self._radar(user.id)
        if radar:
            return self._out(user, radar, RadarSettings.model_validate(radar.settings))
        document = await ProfileService(self.db).document_for(user.id)
        return self._out(user, None, defaults_from_profile(document))

    async def save(self, user: User, update: RadarUpdate) -> RadarOut:
        if not update.settings.roles:
            raise UnprocessableError("Add at least one role to search for.", code="no_roles")
        radar = await self._radar(user.id, lock=True)
        current = radar.version if radar else 0
        if update.version != current:
            raise ConflictError(
                "Your radar was changed somewhere else. Reload to see the latest.",
                code="version_conflict",
                details={"current_version": current},
            )
        payload = update.settings.model_dump(mode="json")
        due = next_brief_at(update.settings, user.timezone)
        if radar is None:
            radar = Radar(user_id=user.id, settings=payload, version=1, next_brief_at=due)
            self.db.add(radar)
        else:
            radar.settings = payload
            radar.version += 1
            radar.next_brief_at = due
        if user.onboarding_step == OnboardingStep.RADAR:
            user.onboarding_step = OnboardingStep.DONE
        await self.db.flush()
        await self.db.refresh(radar)
        return self._out(user, radar, update.settings)

    async def reschedule(self, user: User) -> None:
        """Recompute the next brief time (after the brief ran, or the time zone changed)."""
        radar = await self._radar(user.id)
        if radar:
            radar.next_brief_at = next_brief_at(
                RadarSettings.model_validate(radar.settings), user.timezone
            )

    async def suggest(self, user: User) -> SuggestionsOut:
        await rate_limit.enforce(
            f"radar-suggest:{user.id}",
            limit=SUGGESTIONS_PER_HOUR,
            window_seconds=3600,
            message="That's a lot of suggestions for one hour. Try again a little later.",
        )
        document = await ProfileService(self.db).document_for(user.id)
        if document is None or not document.experiences:
            raise UnprocessableError(
                "Add your experience to your profile first, so suggestions fit you.",
                code="profile_too_thin",
            )
        ideas = await get_ai().structured(
            [
                {"role": "system", "content": prompts.SUGGEST_SYSTEM},
                {"role": "user", "content": profile_as_text(document)},
            ],
            RoleIdeas,
            purpose="radar.suggest",
            user_id=user.id,
            temperature=0.4,
            max_tokens=800,
        )
        roles = []
        seen: set[str] = set()
        for idea in ideas.roles:
            title = _strip_level(idea.title.strip())[:80]
            if title and title.casefold() not in seen:
                seen.add(title.casefold())
                roles.append(RoleSuggestionOut(title=title, reason=idea.reason.strip()))
        return SuggestionsOut(roles=roles[:6], seniority=list(dict.fromkeys(ideas.seniority))[:2])

    async def preview(self, user: User, settings: RadarSettings) -> PreviewOut:
        if not settings.roles:
            raise UnprocessableError("Add at least one role to search for.", code="no_roles")
        if not settings.sources:
            raise UnprocessableError("Turn on at least one job source.", code="no_sources")
        await rate_limit.enforce(
            f"radar-preview:{user.id}",
            limit=PREVIEWS_PER_HOUR,
            window_seconds=3600,
            message="The radar needs a short rest. Try the preview again in a few minutes.",
        )
        queries = build_queries(settings, limit=PREVIEW_PER_QUERY)
        outcomes = await search_many(settings.sources, queries)

        cards: list[JobCard] = []
        seen: set[tuple[str, str]] = set()
        found_by_source: dict[str, int] = {}
        for outcome in outcomes:
            # The same listing often answers two role searches; count it once.
            for card in outcome.cards:
                if (card.source, card.external_id) not in seen:
                    seen.add((card.source, card.external_id))
                    cards.append(card)
                    found_by_source[card.source] = found_by_source.get(card.source, 0) + 1

        relevant = await relevant_titles(settings.roles, [c.title for c in cards], user_id=user.id)
        on_target = [card for card in cards if card.title in relevant]
        result = apply_filters(on_target, settings, utcnow())
        dropped = dict(result.dropped)
        if len(cards) > len(on_target):
            dropped["off_target"] = len(cards) - len(on_target)

        kept = sorted(
            result.kept, key=lambda c: c.posted_at.timestamp() if c.posted_at else 0, reverse=True
        )
        return PreviewOut(
            searched_at=utcnow(),
            searches=[q.keywords for q in queries],
            found=len(cards),
            on_target=len(on_target),
            matching=len(kept),
            dropped=dropped,
            sources=[
                PreviewSourceOut(
                    key=o.source,
                    label=o.label,
                    status=o.status,
                    found=found_by_source.get(o.source, 0),
                    matching=sum(1 for c in kept if c.source == o.source),
                    error=o.error if o.status != "ok" else None,
                )
                for o in outcomes
            ],
            samples=[_card_out(card) for card in kept[:SAMPLE_SIZE]],
        )
