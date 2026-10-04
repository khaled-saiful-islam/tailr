"""Build what a visitor sees from the profile and the page settings.

Only what's meant to be public gets through: no email or phone (contact goes through
the "Contact me" button), city-level location, web links only, and only pictures the
owner uploaded.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Callable
from datetime import datetime

from app.modules.media.models import StoredImage
from app.modules.media.schemas import image_url
from app.modules.profile.document import Bullet, ProfileDocument, YearMonth
from app.modules.public_profile.models import PublicProfile
from app.modules.public_profile.privacy import safe_location, safe_url
from app.modules.public_profile.schemas import (
    CaseStudy,
    PageCase,
    PageCertification,
    PageEducation,
    PageExperience,
    PageImage,
    PageLanguage,
    PageLink,
    PageProject,
    PageSettings,
    PageSkillGroup,
    PublicPage,
)
from app.modules.public_profile.slugs import slugify

SKILL_ORDER = ("technical", "tool", "domain", "soft")
PLACEHOLDER = re.compile(r"\[[^\]]{1,40}\]")


def _lines(bullets: list[Bullet]) -> list[str]:
    """Achievement lines fit to publish: unfinished ones ("by [X%]") stay private."""
    return [b.text for b in bullets if not PLACEHOLDER.search(b.text)]


def _month(value: YearMonth | None) -> str | None:
    if value is None:
        return None
    return f"{value.year}-{value.month:02d}" if value.month else str(value.year)


def missing_for(document: ProfileDocument | None) -> list[str]:
    """What the profile needs before a page can be published."""
    if document is None:
        return ["your name", "a role or project"]
    missing = []
    if not document.basics.full_name:
        missing.append("your name")
    if not document.experiences and not document.projects:
        missing.append("a role or project")
    return missing


def page_url(base_url: str, slug: str) -> str:
    return f"{base_url.rstrip('/')}/p/{slug}"


def project_paths(names: list[tuple[str, str]]) -> dict[str, str]:
    """Readable, unique addresses for projects: [(id, name)] → {id: "rag-assistant"}."""
    paths: dict[str, str] = {}
    used: set[str] = set()
    for project_id, name in names:
        base = slugify(name)[:48] or "project"
        path = base if base not in used else f"{base}-{project_id[:6]}"
        used.add(path)
        paths[project_id] = path
    return paths


def _case(
    case: CaseStudy | None, picture: Callable[[uuid.UUID | None], StoredImage | None]
) -> PageCase | None:
    if case is None:
        return None
    gallery = [image for image_id in case.gallery if (image := picture(image_id))]
    return PageCase(
        overview=case.overview,
        role=case.role,
        timeline=case.timeline,
        team=case.team,
        problem=case.problem,
        approach=case.approach,
        outcome=case.outcome,
        lessons=case.lessons,
        tools=case.tools,
        gallery=[PageImage(url=image_url(i.id), width=i.width, height=i.height) for i in gallery],
    )


def whatsapp_link(number: str | None) -> str | None:
    digits = "".join(ch for ch in number or "" if ch.isdigit())
    return f"https://wa.me/{digits}" if len(digits) >= 8 else None


def build_page(
    row: PublicProfile,
    document: ProfileDocument,
    images: dict[uuid.UUID, StoredImage],
    *,
    base_url: str,
    updated_at: datetime,
    cv_pdf: str | None = None,
    form_token: str | None = None,
) -> PublicPage:
    """`images` holds the owner's own pictures, keyed by id; anything else is ignored."""
    settings = PageSettings.model_validate(row.settings or {})
    portfolio = settings.portfolio
    basics = document.basics

    def picture(image_id: uuid.UUID | None) -> StoredImage | None:
        return images.get(image_id) if image_id else None

    photo = picture(settings.photo_id)
    paths = project_paths([(p.id, p.name) for p in document.projects])
    projects = []
    for project in document.projects:
        image = picture(settings.project_images.get(project.id))
        projects.append(
            PageProject(
                id=project.id,
                path=paths[project.id],
                name=project.name,
                role=project.role,
                url=safe_url(project.url),
                summary=project.summary,
                bullets=_lines(project.bullets),
                image_url=image_url(image.id) if image else None,
                image_width=image.width if image else None,
                image_height=image.height if image else None,
                featured=project.id == settings.featured_project_id,
                case=_case(portfolio.case_studies.get(project.id), picture),
            )
        )
    projects.sort(key=lambda p: not p.featured)  # the featured project leads

    skills = [
        PageSkillGroup(
            category=category,
            names=[s.name for s in document.skills if s.category == category],
        )
        for category in SKILL_ORDER
    ]
    return PublicPage(
        slug=row.slug,
        url=page_url(base_url, row.slug),
        template=row.template,
        appearance=row.appearance,
        name=basics.full_name or "",
        headline=basics.headline,
        summary=basics.summary,
        location=safe_location(basics.location) if settings.show_location else None,
        photo_url=image_url(photo.id) if photo else None,
        availability=settings.availability,
        availability_note=settings.availability_note,
        has_contact=settings.contact_email is not None,
        links=[
            PageLink(label=link.label, url=url)
            for link in basics.links
            if (url := safe_url(link.url))
        ],
        highlights=settings.highlights,
        experiences=[
            PageExperience(
                title=role.title,
                company=role.company,
                location=safe_location(role.location),
                start=_month(role.start),
                end=None if role.current else _month(role.end),
                current=role.current,
                summary=role.summary,
                bullets=_lines(role.bullets),
            )
            for role in document.experiences
        ],
        projects=projects,
        education=[
            PageEducation(
                institution=e.institution,
                qualification=e.qualification,
                field=e.field,
                start_year=e.start_year,
                end_year=e.end_year,
                grade=e.grade,
            )
            for e in document.education
        ],
        certifications=[
            PageCertification(
                name=c.name,
                issuer=c.issuer,
                year=c.issued.year if c.issued else None,
                url=safe_url(c.url),
            )
            for c in document.certifications
        ],
        skills=[group for group in skills if group.names],
        languages=[
            PageLanguage(name=lang.name, proficiency=lang.proficiency)
            for lang in document.languages
        ],
        hidden_sections=settings.hidden_sections,
        cv_url=cv_pdf,
        updated_at=updated_at,
        hero_line=portfolio.hero_line,
        about=[paragraph for paragraph in portfolio.about if paragraph],
        currently=portfolio.currently,
        interests=portfolio.interests,
        expertise=portfolio.expertise,
        awards=portfolio.awards,
        testimonials=portfolio.testimonials,
        layout=portfolio.layout,
        contact_form=portfolio.contact_form,
        whatsapp_url=whatsapp_link(portfolio.whatsapp),
        form_token=form_token if portfolio.contact_form else None,
    )
