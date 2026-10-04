"""The link-preview image (1200 by 630) shown when someone shares a public page.

Rendered by the headless-browser renderer in the page's template colours, turned into
a JPEG under 300 KB (WhatsApp ignores previews over 600 KB), and reused until anything
on it changes.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import io
import json
from pathlib import Path
from typing import Any

import httpx
from jinja2 import Environment, FileSystemLoader, select_autoescape
from PIL import Image

from app.assets.fonts import font_faces
from app.core.config import get_settings
from app.core.errors import UpstreamError
from app.modules.public_profile.schemas import PublicPage

OG_VERSION = "1"  # bump when the design changes, so every image is redrawn
WIDTH, HEIGHT = 1200, 630

_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
)

_GRID = (
    "background-image: linear-gradient({c} 1px, transparent 1px),"
    " linear-gradient(90deg, {c} 1px, transparent 1px); background-size: 40px 40px;"
)

PALETTES: dict[str, dict[str, Any]] = {
    "blueprint": {
        "bg": "#0B1E3A", "ink": "#E8EEF7", "ink2": "#B9C7DD", "ink3": "#7F95B8",
        "accent": "#FFD23F", "badge_bg": "rgba(255,210,63,0.14)", "badge_ink": "#FFD23F",
        "photo_ring": "#23406B", "photo_radius": "8px", "badge_radius": "6px",
        "display_font": "'Archivo', 'Arial Narrow', sans-serif", "display_weight": 800,
        "body_font": "'Archivo', Arial, sans-serif", "tracking": "-0.02em",
        "texture": _GRID.format(c="rgba(127,178,255,0.10)"), "fonts": ["archivo"],
    },
    "broadsheet": {
        "bg": "#F7F7F5", "ink": "#16181D", "ink2": "#3A3F48", "ink3": "#5B6270",
        "accent": "#00756A", "badge_bg": "#E5F2EF", "badge_ink": "#00594F",
        "photo_ring": "#FFFFFF", "photo_radius": "2px", "badge_radius": "2px",
        "display_font": "'Newsreader', Georgia, serif", "display_weight": 600,
        "body_font": "'Schibsted Grotesk', Arial, sans-serif", "tracking": "-0.015em",
        "texture": "border-top: 14px solid #16181D; box-shadow: inset 0 -2px 0 #D9DCE1;",
        "fonts": ["newsreader", "schibsted"],
    },
    "salon": {
        "bg": "#0F0F11", "ink": "#EDEDF0", "ink2": "#C4C4CC", "ink3": "#9A9AA3",
        "accent": "#8B6CFF", "badge_bg": "rgba(139,108,255,0.16)", "badge_ink": "#C9BCFF",
        "photo_ring": "#26262B", "photo_radius": "0", "badge_radius": "999px",
        "display_font": "'Syne', Arial, sans-serif", "display_weight": 700,
        "body_font": "'Instrument Sans', Arial, sans-serif", "tracking": "-0.01em",
        "texture": (
            "background: radial-gradient(60% 80% at 85% 20%, rgba(91,46,255,0.35),"
            " transparent 70%);"
        ),
        "fonts": ["syne", "instrument"],
    },
    "poster": {
        "bg": "#FAFAFA", "ink": "#111827", "ink2": "#374151", "ink3": "#6B7280",
        "accent": "#D7263D", "badge_bg": "#FFBE0B", "badge_ink": "#111827",
        "photo_ring": "#111827", "photo_radius": "50%", "badge_radius": "999px",
        "display_font": "'Unbounded', Arial, sans-serif", "display_weight": 700,
        "body_font": "'Figtree', Arial, sans-serif", "tracking": "-0.02em",
        "texture": (
            "background: radial-gradient(circle at 105% -10%, #D7263D 0 230px, transparent 231px),"
            " radial-gradient(circle at 98% 112%, #3A86FF 0 120px, transparent 121px);"
        ),
        "fonts": ["unbounded", "figtree"],
    },
    "stamp": {
        "bg": "#FFF4E0", "ink": "#0B0B0B", "ink2": "#303030", "ink3": "#555555",
        "accent": "#D61F16", "badge_bg": "#0B0B0B", "badge_ink": "#FFFFFF",
        "photo_ring": "#0B0B0B", "photo_radius": "0", "badge_radius": "0",
        "display_font": "'Bricolage Grotesque', Arial, sans-serif", "display_weight": 800,
        "body_font": "'Space Grotesk', Arial, sans-serif", "tracking": "-0.04em",
        "texture": (
            "background-color: #FFF4E0;"
            " background-image: linear-gradient(rgba(11,11,11,0.07) 1px, transparent 1px),"
            " linear-gradient(90deg, rgba(11,11,11,0.07) 1px, transparent 1px);"
            " background-size: 36px 36px; border-left: 26px solid #D61F16;"
        ),
        "fonts": ["bricolage", "spacegrotesk"],
    },
}  # fmt: skip

AVAILABILITY = {"open": "Open to new roles", "casual": "Open to the right role"}


def inputs_hash(page: PublicPage) -> str:
    """Changes whenever anything drawn on the image changes."""
    drawn = {
        "v": OG_VERSION,
        "template": page.template,
        "name": page.name,
        "headline": page.headline,
        "location": page.location,
        "photo": page.photo_url,
        "availability": page.availability,
        "highlights": [h.model_dump() for h in page.highlights[:2]],
        "slug": page.slug,
    }
    return hashlib.sha256(json.dumps(drawn, sort_keys=True).encode()).hexdigest()


def _initials(name: str) -> str:
    return "".join(word[0] for word in name.split()[:2]).upper() or "T"


def og_html(page: PublicPage, photo: bytes | None) -> str:
    palette = PALETTES.get(page.template, PALETTES["blueprint"])
    name_size = 92 if len(page.name) <= 18 else 76 if len(page.name) <= 28 else 62
    return _env.get_template("og.html").render(
        p=palette,
        font_faces=font_faces(tuple(palette["fonts"])),
        name=page.name,
        name_size=name_size,
        headline=page.headline,
        location=page.location,
        availability=AVAILABILITY.get(page.availability),
        stats=page.highlights[:2],
        photo=f"data:image/webp;base64,{base64.b64encode(photo).decode()}" if photo else None,
        initials=_initials(page.name),
        path=f"/p/{page.slug}",
    )


def _to_jpeg_sync(png: bytes) -> bytes:
    buffer = io.BytesIO()
    Image.open(io.BytesIO(png)).convert("RGB").save(
        buffer, format="JPEG", quality=82, optimize=True, progressive=True
    )
    return buffer.getvalue()


async def render_og(page: PublicPage, photo: bytes | None) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{get_settings().renderer_url}/png",
                json={"html": og_html(page, photo), "width": WIDTH, "height": HEIGHT},
            )
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise UpstreamError("The preview image couldn't be made just now.") from error
    return await to_jpeg(response.content)


async def to_jpeg(png: bytes) -> bytes:
    """A link-preview JPEG: small enough for WhatsApp (under 600 KB)."""
    return await asyncio.to_thread(_to_jpeg_sync, png)
