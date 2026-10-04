"""Turn a kit into HTML (for the in-app preview) and PDF (via the renderer).

The same HTML is used for both, so the preview is exactly what gets downloaded.
Templates follow ATS rules: one column, standard headings and fonts, contact
details in the body, consistent "Mar 2023 to Present" style dates, no tables or images.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.errors import UpstreamError
from app.modules.kits.schemas import CoverLetter, TailoredResume
from app.modules.profile.document import ProfileDocument, YearMonth

DASH = "\u2013"  # an en dash between dates, as resumes use

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

MONTHS = {
    "en": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "ms": ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"],
}
LABELS = {
    "en": {
        "summary": "Summary",
        "experience": "Work Experience",
        "projects": "Projects",
        "education": "Education",
        "skills": "Skills",
        "certifications": "Certifications",
        "languages": "Languages",
        "present": "Present",
    },
    "ms": {
        "summary": "Ringkasan",
        "experience": "Pengalaman Kerja",
        "projects": "Projek",
        "education": "Pendidikan",
        "skills": "Kemahiran",
        "certifications": "Sijil",
        "languages": "Bahasa",
        "present": "Kini",
    },
}
LETTER_DATE = {"en": "%d %B %Y", "ms": "%d/%m/%Y"}


def _month(value: YearMonth | None, language: str) -> str:
    if value is None:
        return ""
    if value.month:
        return f"{MONTHS[language][value.month - 1]} {value.year}"
    return str(value.year)


@dataclass(frozen=True)
class JobInfo:
    title: str
    company: str


def resume_context(
    document: ProfileDocument, resume: TailoredResume, language: str
) -> dict[str, Any]:
    labels = LABELS[language]
    roles_by_id = {role.id: role for role in document.experiences}
    projects_by_id = {project.id: project for project in document.projects}
    roles = []
    for tailored in resume.roles:
        role = roles_by_id.get(tailored.experience_id)
        if role is None:
            continue
        end = labels["present"] if role.current else _month(role.end, language)
        start = _month(role.start, language)
        roles.append(
            {
                "title": role.title,
                "company": role.company,
                "location": role.location,
                "dates": f" {DASH} ".join(part for part in (start, end) if part),
                "bullets": [b.text for b in tailored.bullets],
            }
        )
    projects = []
    for tailored_project in resume.projects:
        project = projects_by_id.get(tailored_project.project_id)
        if project is not None:
            projects.append(
                {
                    "name": project.name,
                    "role": project.role,
                    "bullets": [b.text for b in tailored.bullets],
                }
            )
    basics = document.basics
    contact = [basics.location, basics.email, basics.phone, *(link.url for link in basics.links)]
    return {
        "lang": language,
        "labels": labels,
        "name": basics.full_name or "",
        "headline": resume.headline,
        "contact": [item for item in contact if item],
        "summary": resume.summary,
        "roles": roles,
        "projects": projects,
        "education": [
            {
                "title": ", ".join(p for p in (e.qualification, e.field) if p) or e.institution,
                "institution": e.institution if (e.qualification or e.field) else None,
                "dates": f" {DASH} ".join(str(y) for y in (e.start_year, e.end_year) if y),
                "grade": e.grade,
            }
            for e in document.education
        ],
        "skills": resume.skills,
        "certifications": [
            {"name": c.name, "issuer": c.issuer, "date": _month(c.issued, language)}
            for c in document.certifications
        ],
        "languages": [
            f"{lang.name} ({lang.proficiency})" if lang.proficiency else lang.name
            for lang in document.languages
        ],
    }


def resume_html(document: ProfileDocument, resume: TailoredResume, language: str) -> str:
    return _env.get_template("resume.html").render(**resume_context(document, resume, language))


def letter_html(document: ProfileDocument, letter: CoverLetter, job: JobInfo, language: str) -> str:
    basics = document.basics
    return _env.get_template("letter.html").render(
        lang=language,
        name=basics.full_name or "",
        contact=[item for item in (basics.email, basics.phone, basics.location) if item],
        date=utcnow().strftime(LETTER_DATE[language]).lstrip("0"),
        job=job,
        greeting=letter.greeting,
        paragraphs=letter.paragraphs,
        closing=letter.closing,
    )


async def to_pdf(html: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{get_settings().renderer_url}/pdf", json={"html": html, "format": "A4"}
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise UpstreamError("We couldn't make the PDF just now. Please try again.") from error
    return response.content
