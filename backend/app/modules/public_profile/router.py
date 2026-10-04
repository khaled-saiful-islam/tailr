"""Public page routes.

- /api/v1/public-profile/...      the owner's settings (signed in)
- /api/v1/public/profiles/{slug}  what visitors can reach (no sign-in)
- /p/{slug}                       the portfolio site, with link-preview tags (see `shell`)
"""

from __future__ import annotations

import io
from typing import Literal

import segno
from fastapi import APIRouter, Query, Request, Response, status
from fastapi.responses import HTMLResponse

from app.api.deps import CurrentUser, DbSession, client_ip, session_token
from app.core.config import Environment, get_settings
from app.core.errors import NotFoundError
from app.modules.auth.service import AuthService
from app.modules.public_profile.schemas import (
    ContactOut,
    Highlight,
    PublicPage,
    PublicProfileOut,
    PublicProfileUpdate,
    SlugCheckOut,
)
from app.modules.public_profile.service import PublicProfileService
from app.modules.public_profile.shell import load_shell, render_page
from app.modules.public_profile.views import count_view, source_of

owner_router = APIRouter(prefix="/public-profile", tags=["public profile"])
visitor_router = APIRouter(prefix="/public/profiles", tags=["public profile"])
page_router = APIRouter(include_in_schema=False)

# Visitors' pages: strict, self-contained. Inline styles are needed by the animations.
_CSP = (
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'{dev}; font-src 'self' data:; connect-src 'self'{dev_connect}; "
    "frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
)


def page_headers() -> dict[str, str]:
    # The Vite dev server injects an inline script and a websocket; production has neither.
    dev = get_settings().app_env == Environment.DEVELOPMENT
    return {
        "Content-Security-Policy": _CSP.format(
            dev=" 'unsafe-inline'" if dev else "", dev_connect=" ws: wss:" if dev else ""
        ),
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Cache-Control": "no-cache",
    }


# ── owner ────────────────────────────────────────────────────────────────


@owner_router.get("", response_model=PublicProfileOut)
async def get_settings_(user: CurrentUser, db: DbSession) -> PublicProfileOut:
    """Your page settings and views. Created (switched off) on first visit."""
    return await PublicProfileService(db).get(user)


@owner_router.put("", response_model=PublicProfileOut)
async def update_settings(
    data: PublicProfileUpdate, user: CurrentUser, db: DbSession
) -> PublicProfileOut:
    return await PublicProfileService(db).update(user, data)


@owner_router.get("/slug-check", response_model=SlugCheckOut)
async def check_slug(
    user: CurrentUser, db: DbSession, slug: str = Query(max_length=60)
) -> SlugCheckOut:
    return await PublicProfileService(db).check_slug(user, slug)


@owner_router.get("/preview", response_model=PublicPage)
async def preview(user: CurrentUser, db: DbSession) -> PublicPage:
    """Your page as visitors would see it, published or not."""
    return await PublicProfileService(db).preview(user)


@owner_router.post("/highlights/suggest", response_model=list[Highlight])
async def suggest(user: CurrentUser, db: DbSession) -> list[Highlight]:
    """Up to four numbers worth leading with, each checked against your profile."""
    return await PublicProfileService(db).suggest_highlights(user)


@owner_router.get("/qr.svg", response_class=Response)
async def qr_code(
    user: CurrentUser, db: DbSession, page: Literal["portfolio", "cv"] = "portfolio"
) -> Response:
    """A QR code for your portfolio or your shared CV (visits from it count as "QR")."""
    settings = await PublicProfileService(db).get(user)
    base = settings.url.rsplit("/p/", 1)[0]
    url = f"{base}/cv/{settings.slug}" if page == "cv" else settings.url
    buffer = io.BytesIO()
    segno.make(f"{url}?src=qr", error="m").save(buffer, kind="svg", scale=8, border=2)
    return Response(
        content=buffer.getvalue(),
        media_type="image/svg+xml",
        headers={"Content-Disposition": f'attachment; filename="{settings.slug}-{page}-qr.svg"'},
    )


# ── visitors ─────────────────────────────────────────────────────────────


@visitor_router.get("/{slug}", response_model=PublicPage)
async def public_page(slug: str, db: DbSession) -> PublicPage:
    found = await PublicProfileService(db).published(slug)
    if found is None:
        raise NotFoundError("This page isn't available.")
    return found[1]


@visitor_router.post("/{slug}/contact", response_model=ContactOut)
async def reveal_contact(slug: str, request: Request, db: DbSession) -> ContactOut:
    """The contact email, on request: it's never in the page itself, so scrapers miss it."""
    return await PublicProfileService(db).contact(slug, client_ip(request))


@visitor_router.get("/{slug}/og.jpg", response_class=Response)
async def og_image(slug: str, db: DbSession) -> Response:
    data = await PublicProfileService(db).og_image(slug)
    return Response(
        content=data,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )


@visitor_router.get("/{slug}/cv.pdf", response_class=Response)
async def public_cv(slug: str, request: Request, db: DbSession) -> Response:
    pdf, filename = await PublicProfileService(db).cv(slug, client_ip(request))
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── the page ─────────────────────────────────────────────────────────────


@page_router.get("/p/{slug}", response_class=HTMLResponse)
async def page(slug: str, request: Request, db: DbSession) -> HTMLResponse:
    service = PublicProfileService(db)
    found = await service.published(slug)
    shell = await load_shell()
    if found is None:
        return HTMLResponse(
            render_page(shell, None, og_image="", index=False),
            status_code=status.HTTP_404_NOT_FOUND,
            headers=page_headers(),
        )
    row, public = found
    token = session_token(request)
    viewer = await AuthService(db).resolve(token) if token else None
    if not await service.is_owner(row, viewer.id if viewer else None):
        await count_view(
            row.id,
            ip=client_ip(request),
            user_agent=request.headers.get("user-agent"),
            source=source_of(request.headers.get("referer"), request.query_params.get("src")),
        )
    html = render_page(
        shell, public, og_image=service.og_url(public), index=row.visibility == "public"
    )
    return HTMLResponse(html, headers=page_headers())
