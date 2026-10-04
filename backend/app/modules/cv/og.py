"""The link-preview image for a shared CV: its first page beside the person's name."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.assets.fonts import font_faces
from app.core.config import get_settings
from app.core.errors import UpstreamError
from app.modules.cv.schemas import ACCENTS, PublicCv
from app.modules.public_profile.og import HEIGHT, WIDTH, to_jpeg

OG_VERSION = "1"
_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
)


def og_hash(document_html: str, meta: PublicCv) -> str:
    raw = f"{OG_VERSION}|{meta.name}|{meta.headline}|{meta.slug}|{document_html}"
    return hashlib.sha256(raw.encode()).hexdigest()


def og_html(meta: PublicCv, document_html: str, accent: str) -> str:
    colour = ACCENTS.get(accent, ACCENTS["ink"])
    # The thumbnail doesn't need the page guides drawn for the screen preview.
    thumbnail = re.sub(r"body::after\s*\{[^}]*\}", "", document_html)
    return _env.get_template("og.html").render(
        font_faces=font_faces(("newsreader", "schibsted")),
        name=meta.name,
        name_size=84 if len(meta.name) <= 20 else 66,
        headline=meta.headline,
        path=f"/cv/{meta.slug}",
        accent=colour,
        accent_soft=colour + "1a",
        document=thumbnail,
    )


async def render_og(meta: PublicCv, document_html: str, accent: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{get_settings().renderer_url}/png",
                json={
                    "html": og_html(meta, document_html, accent),
                    "width": WIDTH,
                    "height": HEIGHT,
                },
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise UpstreamError("The preview image couldn't be made just now.") from error
    return await to_jpeg(response.content)
