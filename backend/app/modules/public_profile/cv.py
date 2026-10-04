"""The CV visitors can download from a public page: the whole profile, nothing private.

Same ATS-friendly layout as the Apply Kit resume, untailored. The phone number and
street address never appear; the email shown is the page's contact email, if any.
"""

from __future__ import annotations

from app.modules.kits.render import resume_html
from app.modules.kits.schemas import (
    TailoredBullet,
    TailoredProject,
    TailoredResume,
    TailoredRole,
)
from app.modules.profile.document import ProfileDocument
from app.modules.public_profile.assemble import PLACEHOLDER
from app.modules.public_profile.privacy import safe_location, safe_url
from app.modules.public_profile.schemas import PageSettings


def public_document(document: ProfileDocument, settings: PageSettings) -> ProfileDocument:
    basics = document.basics
    links = [link for link in basics.links if safe_url(link.url)]
    return document.model_copy(
        update={
            "basics": basics.model_copy(
                update={
                    "email": str(settings.contact_email) if settings.contact_email else None,
                    "phone": None,
                    "location": safe_location(basics.location) if settings.show_location else None,
                    "links": links,
                }
            )
        }
    )


def public_resume(document: ProfileDocument) -> TailoredResume:
    return TailoredResume(
        headline=document.basics.headline or "",
        summary=document.basics.summary or "",
        roles=[
            TailoredRole(
                experience_id=role.id,
                bullets=[
                    TailoredBullet(text=b.text, fact_ids=[b.id])
                    for b in role.bullets
                    if not PLACEHOLDER.search(b.text)
                ],
            )
            for role in document.experiences
        ],
        projects=[
            TailoredProject(
                project_id=project.id,
                bullets=[
                    TailoredBullet(text=b.text, fact_ids=[b.id])
                    for b in project.bullets
                    if not PLACEHOLDER.search(b.text)
                ],
            )
            for project in document.projects
        ],
        skills=[skill.name for skill in document.skills][:24],
    )


def public_cv_html(document: ProfileDocument, settings: PageSettings) -> str:
    safe = public_document(document, settings)
    return resume_html(safe, public_resume(safe), "en")
