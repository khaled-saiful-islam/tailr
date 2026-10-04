"""Draw a CV: one HTML document for the live preview, the share page and the PDF.

Every design is a Jinja template on A4 or Letter, with its fonts inlined (the
renderer has no network). The same HTML prints to PDF, so what you see is what
you download.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.assets.fonts import font_faces
from app.modules.cv.schemas import ACCENTS, CvOptions
from app.modules.kits.render import DASH, MONTHS
from app.modules.kits.schemas import TailoredResume
from app.modules.matching.signals import canonical
from app.modules.profile.document import ProfileDocument, YearMonth
from app.modules.public_profile.privacy import safe_location

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

FONTS = {
    "meridian": ("newsreader", "schibsted"),
    "ledger": ("archivo", "martian"),
    "atelier": ("syne", "instrument"),
    "monogram": ("figtree",),
    "broadsheet": ("newsreader", "schibsted"),
}

LABELS = {
    "en": {
        "summary": "Profile",
        "experience": "Experience",
        "projects": "Projects",
        "education": "Education",
        "skills": "Skills",
        "certifications": "Certifications",
        "languages": "Languages",
        "contact": "Contact",
        "present": "Present",
        "technical": "Technical",
        "tool": "Tools",
        "domain": "Domain",
        "soft": "Ways of working",
        "native": "Native",
        "fluent": "Fluent",
        "professional": "Professional",
        "conversational": "Conversational",
        "basic": "Basic",
    },
    "ms": {
        "summary": "Profil",
        "experience": "Pengalaman",
        "projects": "Projek",
        "education": "Pendidikan",
        "skills": "Kemahiran",
        "certifications": "Pensijilan",
        "languages": "Bahasa",
        "contact": "Hubungi",
        "present": "Kini",
        "technical": "Teknikal",
        "tool": "Alatan",
        "domain": "Bidang",
        "soft": "Cara bekerja",
        "native": "Penutur asli",
        "fluent": "Fasih",
        "professional": "Profesional",
        "conversational": "Perbualan",
        "basic": "Asas",
    },
}

SKILL_ORDER = ("technical", "tool", "domain", "soft")
PAPER = {"A4": ("210mm", "297mm"), "Letter": ("8.5in", "11in")}


@dataclass(frozen=True)
class Contact:
    kind: str  # email | phone | location | link
    text: str
    href: str | None


def _month(value: YearMonth | None, language: str) -> str:
    if value is None:
        return ""
    return f"{MONTHS[language][value.month - 1]} {value.year}" if value.month else str(value.year)


def _range(start: str, end: str) -> str:
    return f" {DASH} ".join(part for part in (start, end) if part)


def _link_text(url: str) -> str:
    parts = urlsplit(url if "://" in url else f"https://{url}")
    host = (parts.hostname or url).removeprefix("www.")
    path = parts.path.rstrip("/")
    return f"{host}{path}" if path and len(path) < 32 else host


def _mix(hex_colour: str, amount: float) -> str:
    """The colour mixed with white: amount 0 = white, 1 = the colour."""
    value = hex_colour.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) for i in (0, 2, 4))
    blend = [round(255 - (255 - c) * amount) for c in (r, g, b)]
    return "#" + "".join(f"{c:02x}" for c in blend)


def _initials(name: str) -> str:
    return "".join(word[0] for word in name.split()[:2]).upper() or "CV"


def cv_context(
    document: ProfileDocument,
    content: TailoredResume,
    options: CvOptions,
    *,
    template: str,
    accent: str,
    photo: bytes | None = None,
    public: bool = False,
) -> dict[str, Any]:
    """Everything a template draws. `public`: the shared version, so no phone number."""
    lang = options.language
    labels = LABELS[lang]
    basics = document.basics
    hidden = set(options.hidden_sections)

    contact: list[Contact] = []
    if basics.email and options.show_email:
        contact.append(Contact("email", basics.email, f"mailto:{basics.email}"))
    if basics.phone and options.show_phone and not public:
        contact.append(Contact("phone", basics.phone, f"tel:{basics.phone.replace(' ', '')}"))
    location = safe_location(basics.location) if public else basics.location
    if location:
        contact.append(Contact("location", location, None))
    for link in basics.links:
        url = link.url if "://" in link.url else f"https://{link.url}"
        if urlsplit(url).scheme in {"http", "https"}:
            contact.append(Contact("link", _link_text(link.url), url))

    roles_by_id = {role.id: role for role in document.experiences}
    roles = []
    for tailored in content.roles:
        role = roles_by_id.get(tailored.experience_id)
        if role is None:
            continue
        end = labels["present"] if role.current else _month(role.end, lang)
        roles.append(
            {
                "title": role.title,
                "company": role.company,
                "location": role.location,
                "dates": _range(_month(role.start, lang), end),
                "start_year": str(role.start.year) if role.start else "",
                "current": role.current,
                "bullets": [b.text for b in tailored.bullets],
            }
        )

    projects_by_id = {project.id: project for project in document.projects}
    projects = []
    for tailored_project in content.projects:
        project = projects_by_id.get(tailored_project.project_id)
        if project is not None:
            projects.append(
                {
                    "name": project.name,
                    "role": project.role,
                    "url": _link_text(project.url) if project.url else None,
                    "bullets": [b.text for b in tailored_project.bullets],
                }
            )

    categories = {canonical(s.name): s.category for s in document.skills}
    grouped: dict[str, list[str]] = {}
    for name in content.skills:
        grouped.setdefault(categories.get(canonical(name), "technical"), []).append(name)
    skill_groups = [
        {"label": labels[category], "names": grouped[category]}
        for category in SKILL_ORDER
        if grouped.get(category)
    ]

    colour = ACCENTS.get(accent, ACCENTS["ink"])
    width, height = PAPER[options.paper]
    name = basics.full_name or ""
    return {
        "lang": lang,
        "labels": labels,
        "name": name,
        "first_name": name.split(" ")[0] if name else "",
        "initials": _initials(name),
        "headline": content.headline or basics.headline,
        "summary": content.summary,
        "contact": contact,
        "roles": roles,
        "projects": projects,
        "education": [
            {
                "title": ", ".join(p for p in (e.qualification, e.field) if p) or e.institution,
                "institution": e.institution if (e.qualification or e.field) else None,
                "dates": _range(str(e.start_year or ""), str(e.end_year or "")),
                "grade": e.grade,
            }
            for e in document.education
        ],
        "skills": content.skills,
        "skill_groups": skill_groups,
        "certifications": [
            {"name": c.name, "issuer": c.issuer, "date": _month(c.issued, lang)}
            for c in document.certifications
        ],
        "languages": [
            {"name": lang_.name, "level": labels.get(lang_.proficiency or "", None)}
            for lang_ in document.languages
        ],
        "show": {
            section: section not in hidden
            for section in (
                "summary",
                "experience",
                "projects",
                "education",
                "skills",
                "certifications",
                "languages",
            )
        },
        "photo": f"data:image/webp;base64,{base64.b64encode(photo).decode()}" if photo else None,
        "accent": colour,
        "accent_soft": _mix(colour, 0.09),
        "accent_mid": _mix(colour, 0.22),
        "density": options.density,
        "fs": 9.2 if options.density == "compact" else 10,
        "paper": options.paper,
        "page_width": width,
        "page_height": height,
        "font_faces": font_faces(FONTS.get(template, FONTS["meridian"])),
    }


def cv_html(
    document: ProfileDocument,
    content: TailoredResume,
    options: CvOptions,
    *,
    template: str,
    accent: str,
    photo: bytes | None = None,
    public: bool = False,
) -> str:
    context = cv_context(
        document, content, options, template=template, accent=accent, photo=photo, public=public
    )
    name = template if template in FONTS else "meridian"
    return _env.get_template(f"{name}.html").render(**context)
