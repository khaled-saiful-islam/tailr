from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, status
from fastapi.responses import HTMLResponse, Response

from app.api.deps import CurrentUser, DbSession
from app.modules.kits.schemas import KitCreate, KitOut, KitRegenerate, KitSummaryOut, KitUpdate
from app.modules.kits.service import KitService

router = APIRouter(prefix="/kits", tags=["kits"])


@router.post("", response_model=KitOut, status_code=status.HTTP_202_ACCEPTED)
async def create_kit(data: KitCreate, user: CurrentUser, db: DbSession) -> KitOut:
    """Tailor an application for a job (or return the kit that already exists)."""
    return await KitService(db).create(user, data)


@router.get("", response_model=list[KitSummaryOut])
async def list_kits(user: CurrentUser, db: DbSession) -> list[KitSummaryOut]:
    return await KitService(db).list(user)


@router.get("/by-match/{match_id}", response_model=KitOut | None)
async def kit_for_match(match_id: uuid.UUID, user: CurrentUser, db: DbSession) -> KitOut | None:
    """The kit for this job, or null if none has been made yet."""
    return await KitService(db).for_match(user, match_id)


@router.get("/{kit_id}", response_model=KitOut)
async def get_kit(kit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> KitOut:
    return await KitService(db).get(user, kit_id)


@router.put("/{kit_id}", response_model=KitOut)
async def update_kit(
    kit_id: uuid.UUID, data: KitUpdate, user: CurrentUser, db: DbSession
) -> KitOut:
    return await KitService(db).update(user, kit_id, data)


@router.post("/{kit_id}/regenerate", response_model=KitOut, status_code=status.HTTP_202_ACCEPTED)
async def regenerate_kit(
    kit_id: uuid.UUID, data: KitRegenerate, user: CurrentUser, db: DbSession
) -> KitOut:
    return await KitService(db).regenerate(user, kit_id, data)


@router.get("/{kit_id}/{which}.html", response_class=HTMLResponse)
async def kit_html(
    kit_id: uuid.UUID, which: Literal["resume", "letter"], user: CurrentUser, db: DbSession
) -> HTMLResponse:
    """The document exactly as the PDF will look (used for the in-app preview)."""
    service = KitService(db)
    html = await (
        service.resume_html(user, kit_id)
        if which == "resume"
        else service.letter_html(user, kit_id)
    )
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


@router.get("/{kit_id}/{which}.pdf")
async def kit_pdf(
    kit_id: uuid.UUID, which: Literal["resume", "letter"], user: CurrentUser, db: DbSession
) -> Response:
    pdf, filename = await KitService(db).pdf(user, kit_id, which)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
