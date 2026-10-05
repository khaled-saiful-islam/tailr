"""The HTML for /p/<slug>: the built public-page shell with the profile filled in.

Link previews (WhatsApp, LinkedIn, X, Slack) don't run JavaScript, so the title,
Open Graph tags and structured data are written into the HTML here. The page data
travels as JSON in the same response, so the page renders without another request,
and a plain-HTML version sits in #root for anything that doesn't run scripts.
"""

from __future__ import annotations

import json
import re
import time
from html import escape
from typing import Any

import httpx
from fastapi import Request

from app.core.config import get_settings
from app.core.logging import get_logger
from app.modules.public_profile.schemas import PublicPage

log = get_logger(__name__)

SHELL_TTL_SECONDS = 60
_FALLBACK_SHELL = (
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" />'
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    '<title>Tailr</title></head><body><div id="root"></div></body></html>'
)
# The header the Vite dev proxy adds, so pages it serves use its shell (with hot reload).
DEV_SHELL_HEADER = "x-tailr-dev-shell"
_cache: dict[str, tuple[float, str]] = {}


def shell_url(request: Request | None) -> str:
    """The built shell, except for pages asked for through the Vite dev server."""
    settings = get_settings()
    if (
        settings.dev_shell_url
        and request is not None
        and request.headers.get(DEV_SHELL_HEADER) == "1"
    ):
        return settings.dev_shell_url
    return settings.web_shell_url


async def load_shell(request: Request | None = None) -> str:
    """The shell, cached for a minute; a bare fallback if it can't be fetched."""
    global _cache
    url = shell_url(request)
    cached = _cache.get(url)
    if cached and time.monotonic() - cached[0] < SHELL_TTL_SECONDS:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(url)
            response.raise_for_status()
            shell = response.text
    except httpx.HTTPError:
        log.warning("public_shell_unavailable", url=url)
        return cached[1] if cached else _FALLBACK_SHELL
    _cache = {**_cache, url: (time.monotonic(), shell)}
    return shell


def script_json(data: Any) -> str:
    """JSON that is safe inside a <script> element."""
    return (
        json.dumps(data, ensure_ascii=False, default=str)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def _absolute(url: str | None) -> str | None:
    if not url:
        return None
    return url if url.startswith("http") else f"{get_settings().public_web_url.rstrip('/')}{url}"


def title_for(page: PublicPage) -> str:
    return f"{page.name}, {page.headline}" if page.headline else page.name


def description_for(page: PublicPage) -> str:
    first = page.about[0] if page.about else None
    text = page.hero_line or first or page.summary or page.headline or f"{page.name} on Tailr."
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= 200 else text[:197].rsplit(" ", 1)[0] + "..."


def json_ld(page: PublicPage) -> dict[str, Any]:
    current = next((e for e in page.experiences if e.current), None)
    person: dict[str, Any] = {
        "@type": "Person",
        "name": page.name,
        "url": page.url,
        "jobTitle": page.headline,
        "image": _absolute(page.photo_url),
        "sameAs": [link.url for link in page.links],
        "worksFor": {"@type": "Organization", "name": current.company} if current else None,
        "alumniOf": [
            {"@type": "EducationalOrganization", "name": e.institution} for e in page.education
        ],
        "knowsAbout": [name for group in page.skills for name in group.names][:20],
        "knowsLanguage": [language.name for language in page.languages],
        "address": {"@type": "PostalAddress", "addressLocality": page.location}
        if page.location
        else None,
    }
    return {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "dateModified": page.updated_at.isoformat(),
        "mainEntity": {key: value for key, value in person.items() if value},
    }


def meta_tags(
    *,
    title: str,
    description: str,
    url: str,
    og_image: str,
    index: bool,
    og_type: str = "profile",
    structured: dict[str, Any] | None = None,
) -> str:
    """Head tags for link previews and search engines."""
    title_, description_, url_, image = (escape(v) for v in (title, description, url, og_image))
    tags = [
        f'<meta name="description" content="{description_}" />',
        f'<link rel="canonical" href="{url_}" />',
        f'<meta name="robots" content="{"index, follow" if index else "noindex, nofollow"}" />',
        f'<meta property="og:type" content="{og_type}" />',
        f'<meta property="og:title" content="{title_}" />',
        f'<meta property="og:description" content="{description_}" />',
        f'<meta property="og:url" content="{url_}" />',
        f'<meta property="og:image" content="{image}" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        '<meta property="og:site_name" content="Tailr" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{title_}" />',
        f'<meta name="twitter:description" content="{description_}" />',
        f'<meta name="twitter:image" content="{image}" />',
    ]
    if structured:
        tags.append(f'<script type="application/ld+json">{script_json(structured)}</script>')
    return "\n    ".join(tags)


def _fallback_body(page: PublicPage) -> str:
    """Plain HTML for crawlers and browsers without JavaScript; React replaces it."""
    parts = [f"<h1>{escape(page.name)}</h1>"]
    if page.hero_line:
        parts.append(f"<p>{escape(page.hero_line)}</p>")
    if page.headline:
        parts.append(f"<p>{escape(page.headline)}</p>")
    if page.summary:
        parts.append(f"<p>{escape(page.summary)}</p>")
    parts += [f"<p>{escape(paragraph)}</p>" for paragraph in page.about]
    for role in page.experiences:
        parts.append(f"<h2>{escape(role.title)}, {escape(role.company)}</h2>")
        parts += [f"<p>{escape(bullet)}</p>" for bullet in role.bullets]
    for project in page.projects:
        parts.append(f"<h2>{escape(project.name)}</h2>")
        if project.summary:
            parts.append(f"<p>{escape(project.summary)}</p>")
    return f"<main>{''.join(parts)}</main>"


def render_shell(shell: str, *, title: str, head: str, body: str, data: Any) -> str:
    """Fill the built shell: title, head tags, fallback HTML in #root, and the page data."""
    html = re.sub(
        r"<title>.*?</title>", f"<title>{escape(title)}</title>", shell, count=1, flags=re.S
    )
    html = html.replace("</head>", f"    {head}\n  </head>", 1)
    return html.replace(
        '<div id="root"></div>',
        f'<div id="root">{body}</div>\n    '
        f'<script id="page-data" type="application/json">{script_json(data)}</script>',
        1,
    )


NOT_AVAILABLE_BODY = "<main><h1>This page isn't available.</h1></main>"


def render_not_available(shell: str) -> str:
    return render_shell(
        shell,
        title="Page not available | Tailr",
        head='<meta name="robots" content="noindex, nofollow" />',
        body=NOT_AVAILABLE_BODY,
        data=None,
    )


def _sub_page(page: PublicPage, path: str) -> tuple[str, str, str]:
    """(title, description, canonical url) for /about, /work, /work/<project>, /contact."""
    parts = [part for part in path.split("/") if part]
    url = f"{page.url}/{'/'.join(parts)}" if parts else page.url
    if len(parts) == 2:
        project = next((p for p in page.projects if p.path == parts[1]), None)
        if project is not None:
            text = (project.case.overview if project.case else None) or project.summary
            return f"{project.name} by {page.name}", text or description_for(page), url
    titles = {
        "about": f"About {page.name}",
        "work": f"Work by {page.name}",
        "contact": f"Contact {page.name}",
    }
    title = titles.get(parts[0], title_for(page)) if parts else title_for(page)
    return title, description_for(page), url


def render_page(
    shell: str, page: PublicPage | None, *, og_image: str, index: bool, path: str = ""
) -> str:
    """A portfolio page: the shell with its head tags, fallback HTML and data."""
    if page is None:
        return render_not_available(shell)
    title, description, url = _sub_page(page, path)
    head = meta_tags(
        title=title,
        description=description,
        url=url,
        og_image=og_image,
        index=index,
        structured=json_ld(page) if not path else None,
    )
    return render_shell(
        shell,
        title=f"{title} | Tailr",
        head=head,
        body=_fallback_body(page),
        data={"kind": "portfolio", **page.model_dump(mode="json")},
    )
