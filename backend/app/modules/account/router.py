"""Account routes: usage, export, delete."""

from __future__ import annotations

import json

from fastapi import APIRouter, BackgroundTasks, Response

from app.api.deps import CurrentUser, DbSession
from app.core import rate_limit
from app.core.clock import local_today
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.schemas import Ok
from app.modules.account.schemas import DeleteAccountRequest, UsageOut
from app.modules.account.service import AccountService
from app.storage.files import get_storage

router = APIRouter(prefix="/account", tags=["account"])
log = get_logger(__name__)


@router.get("/usage", response_model=UsageOut)
async def usage(user: CurrentUser, db: DbSession) -> UsageOut:
    return await AccountService(db).usage(user)


@router.get("/export", response_class=Response)
async def export(user: CurrentUser, db: DbSession) -> Response:
    """A JSON file of everything Tailr holds about you."""
    await rate_limit.enforce(
        f"export:{user.id}",
        limit=5,
        window_seconds=3600,
        message="You've exported a few times this hour. Try again later.",
    )
    data = await AccountService(db).export(user)
    name = f"tailr-export-{local_today(user.timezone).isoformat()}.json"
    return Response(
        content=json.dumps(data, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{name}"',
            "Cache-Control": "no-store",
        },
    )


async def _remove_files(keys: list[str]) -> None:
    storage = get_storage()
    for key in keys:
        try:
            await storage.delete(key)
        except Exception as error:  # a missing file mustn't stop the rest
            log.warning("account_file_delete_failed", key=key, error=str(error)[:200])


@router.delete("", response_model=Ok)
async def delete_account(
    data: DeleteAccountRequest,
    response: Response,
    background: BackgroundTasks,
    user: CurrentUser,
    db: DbSession,
) -> Ok:
    """Delete your account and everything in it. This can't be undone."""
    keys = await AccountService(db).delete(user, data.password)
    background.add_task(_remove_files, keys)  # after the deletion is committed
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return Ok()
