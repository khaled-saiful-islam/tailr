"""The demo's published portfolio: words, pictures, a few weeks of visits, one message."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import local_today
from app.modules.auth.models import User
from app.modules.media.models import StoredImage
from app.modules.profile.document import ProfileDocument
from app.modules.public_profile.models import (
    PortfolioMessage,
    PublicProfile,
    PublicProfileViews,
)
from app.modules.public_profile.schemas import (
    Award,
    CaseStudy,
    Expertise,
    Highlight,
    PageSettings,
    PortfolioContent,
    Testimonial,
)
from app.scripts.demo_data import DEMO_SLUG, DEMO_TIMEZONE, HIGHLIGHTS, PORTFOLIO
from app.scripts.demo_kits import fact_ids

# Visits per day over the last two weeks, oldest first, and where they came from.
VISITS = [2, 4, 3, 7, 5, 1, 0, 6, 9, 4, 3, 8, 5, 6]
SOURCE_SPLIT = ("linkedin", "whatsapp", "qr", "other")


def _content(document: ProfileDocument, gallery: dict[str, list[StoredImage]]) -> PortfolioContent:
    projects = {project.name: project.id for project in document.projects}
    raw = PORTFOLIO
    cases = {
        projects[name]: CaseStudy(**case, gallery=[image.id for image in gallery.get(name, [])])
        for name, case in raw["case_studies"].items()
    }
    return PortfolioContent(
        hero_line=raw["hero_line"],
        about=raw["about"],
        currently=raw["currently"],
        interests=raw["interests"],
        expertise=[Expertise(**item) for item in raw["expertise"]],
        awards=[Award(**item) for item in raw["awards"]],
        testimonials=[Testimonial(**item) for item in raw["testimonials"]],
        case_studies=cases,
        layout="one_page",
        contact_form=True,
    )


async def add_portfolio(
    db: AsyncSession,
    user: User,
    document: ProfileDocument,
    images: dict[str, StoredImage],
    gallery: dict[str, list[StoredImage]],
    now: datetime,
) -> PublicProfile:
    ids = fact_ids(document)
    projects = {project.name: project.id for project in document.projects}
    settings = PageSettings(
        availability="open",
        availability_note="AI engineering roles in KL or remote",
        contact_email="aina.demo@example.com",
        highlights=[
            Highlight(value=value, label=label, fact_id=ids[key])
            for value, label, key in HIGHLIGHTS
        ],
        project_images={projects[name]: image.id for name, image in images.items()},
        featured_project_id=projects["Policy assistant"],
        portfolio=_content(document, gallery),
    )
    page = PublicProfile(
        user_id=user.id,
        slug=DEMO_SLUG,
        visibility="public",
        template="blueprint",
        appearance="auto",
        settings=settings.model_dump(mode="json"),
        version=1,
        published_at=now - timedelta(days=14),
    )
    db.add(page)
    await db.flush()

    today = local_today(DEMO_TIMEZONE)
    for offset, views in enumerate(reversed(VISITS)):
        if not views:
            continue
        sources = {SOURCE_SPLIT[i % 4]: 0 for i in range(4)}
        for visit in range(views):
            sources[SOURCE_SPLIT[(visit + offset) % 3 if visit % 4 else 0]] += 1
        db.add(
            PublicProfileViews(
                profile_id=page.id,
                day=today - timedelta(days=offset),
                views=views,
                sources={key: value for key, value in sources.items() if value},
            )
        )

    db.add(
        PortfolioMessage(
            profile_id=page.id,
            name="Farah Lim",
            email="farah@example.com",
            reason="freelance",
            company="Kopi Labs",
            message="Hi Aina, we're building a support assistant for our cafes and would "
            "love your help for three months. Could we talk next week?",
            flagged=False,
            sender_hash="demo",
        )
    )
    return page
