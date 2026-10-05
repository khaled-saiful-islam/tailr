"""CV routes.

- /api/v1/cv/...               your CV: words, design, AI edits, preview, PDF (signed in)
- /api/v1/public/cv/{slug}/... the shared CV's document, PDF and preview image
- /cv/{slug}                   the share page (document viewer with link-preview tags)
"""

from __future__ import annotations

from html import escape
from typing import Annotated

from fastapi import APIRouter, Query, Request, Response, status
from fastapi.responses import HTMLResponse

from app.api.deps import CurrentUser, DbSession, client_ip
from app.core.errors import NotFoundError
from app.modules.cv.og import og_hash, render_og
from app.modules.cv.schemas import Accent, CvAiRequest, CvOut, CvTemplate, CvUpdate
from app.modules.cv.service import CvService
from app.modules.public_profile.router import page_headers
from app.modules.public_profile.shell import (
    load_shell,
    meta_tags,
    render_not_available,
    render_shell,
)
from app.storage.files import get_storage

owner_router = APIRouter(prefix="/cv", tags=["cv"])
public_router = APIRouter(prefix="/public/cv", tags=["cv"])
page_router = APIRouter(include_in_schema=False)

VersionQuery = Annotated[int, Query(ge=0)]


def _pdf(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _document(html: str) -> HTMLResponse:
    # Shown inside our own pages only (the editor preview and the share page).
    return HTMLResponse(
        html,
        headers={
            "X-Frame-Options": "SAMEORIGIN",
            "Content-Security-Policy": (
                "default-src 'none'; img-src data:; style-src 'unsafe-inline'; "
                "font-src data:; frame-ancestors 'self'"
            ),
            "Cache-Control": "no-cache",
        },
    )


# ── owner ────────────────────────────────────────────────────────────────


@owner_router.get("", response_model=CvOut)
async def get_cv(user: CurrentUser, db: DbSession) -> CvOut:
    """Your CV. Made from your profile the first time you open it."""
    return await CvService(db).get(user)


@owner_router.put("", response_model=CvOut)
async def save_cv(data: CvUpdate, user: CurrentUser, db: DbSession) -> CvOut:
    return await CvService(db).update(user, data)


@owner_router.post("/reset", response_model=CvOut)
async def reset_cv(user: CurrentUser, db: DbSession, version: VersionQuery) -> CvOut:
    """Start the words again from your profile; the design stays."""
    return await CvService(db).reset(user, version)


@owner_router.post("/undo", response_model=CvOut)
async def undo_cv(user: CurrentUser, db: DbSession, version: VersionQuery) -> CvOut:
    return await CvService(db).undo(user, version)


@owner_router.post("/ai", response_model=CvOut, status_code=status.HTTP_202_ACCEPTED)
async def improve_cv(request: CvAiRequest, user: CurrentUser, db: DbSession) -> CvOut:
    """Edit with AI in the background; every line is checked against your profile."""
    return await CvService(db).start_ai(user, request)


@owner_router.get("/document.html", response_class=HTMLResponse)
async def preview(
    user: CurrentUser,
    db: DbSession,
    template: CvTemplate | None = None,
    accent: Accent | None = None,
) -> HTMLResponse:
    """The document as it prints; `template`/`accent` try another design without saving."""
    return _document(await CvService(db).html(user, template=template, accent=accent))


@owner_router.get("/cv.pdf", response_class=Response)
async def download(user: CurrentUser, db: DbSession) -> Response:
    return _pdf(*await CvService(db).pdf(user))


# ── visitors ─────────────────────────────────────────────────────────────


@public_router.get("/{slug}/document.html", response_class=HTMLResponse)
async def public_document(slug: str, db: DbSession) -> HTMLResponse:
    return _document(await CvService(db).public_html(slug))


@public_router.get("/{slug}/cv.pdf", response_class=Response)
async def public_pdf(slug: str, request: Request, db: DbSession) -> Response:
    return _pdf(*await CvService(db).public_pdf(slug, client_ip(request)))


@public_router.get("/{slug}/og.jpg", response_class=Response)
async def og_image(slug: str, db: DbSession) -> Response:
    service = CvService(db)
    found = await service.public_meta(slug)
    if found is None:
        raise NotFoundError("This CV isn't available.")
    cv, meta, _ = found
    document = await service.public_html(slug)
    wanted = og_hash(document, meta)
    storage = get_storage()
    data: bytes | None = None
    if cv.og_key and cv.og_hash == wanted:
        try:
            data = await storage.read(cv.og_key)
        except NotFoundError:
            data = None
    if data is None:
        data = await render_og(meta, document, cv.accent)
        old = cv.og_key
        cv.og_key = await storage.save(data, folder="og", suffix="jpg")
        cv.og_hash = wanted
        if old:
            await storage.delete(old)
    return Response(
        content=data,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )


# ── the share page ───────────────────────────────────────────────────────


@page_router.get("/cv/{slug}", response_class=HTMLResponse)
async def share_page(slug: str, request: Request, db: DbSession) -> HTMLResponse:
    service = CvService(db)
    found = await service.public_meta(slug)
    shell = await load_shell(request)
    if found is None:
        return HTMLResponse(
            render_not_available(shell),
            status_code=status.HTTP_404_NOT_FOUND,
            headers=page_headers(),
        )
    cv, meta, _ = found
    document = await service.public_html(slug)
    version = og_hash(document, meta)[:12]
    title = f"{meta.name}, CV" if not meta.headline else f"{meta.name}, {meta.headline}"
    head = meta_tags(
        title=f"{title} | CV",
        description=f"{meta.name}'s CV. View it online or download the PDF.",
        url=meta.url,
        og_image=f"{meta.url.rsplit('/cv/', 1)[0]}/api/v1/public/cv/{meta.slug}/og.jpg?v={version}",
        index=cv.visibility == "public",
        og_type="website",
    )
    html = render_shell(
        shell,
        title=f"{title} | Tailr",
        head=head,
        body=(
            f"<main><h1>{escape(meta.name)}</h1>"
            f'<p><a href="{escape(meta.pdf_url)}">Download the CV (PDF)</a></p></main>'
        ),
        data={"kind": "cv", **meta.model_dump(mode="json")},
    )
    return HTMLResponse(html, headers=page_headers())
