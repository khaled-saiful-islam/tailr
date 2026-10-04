"""Health and live-events endpoints."""

from __future__ import annotations

import contextlib
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from sqlalchemy import text
from sse_starlette.sse import EventSourceResponse

from app.api.deps import session_token
from app.core.db import session_factory
from app.core.errors import AuthenticationError
from app.core.events import subscribe
from app.core.redis import get_redis
from app.core.schemas import Schema
from app.modules.auth.service import AuthService

router = APIRouter(tags=["system"])

PING_SECONDS = 15


class HealthOut(Schema):
    status: str
    database: bool
    redis: bool


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    database = redis = False
    with contextlib.suppress(Exception):
        async with session_factory()() as db:
            await db.execute(text("select 1"))
        database = True
    with contextlib.suppress(Exception):
        redis = bool(await get_redis().ping())
    status = "ok" if database and redis else "degraded"
    return HealthOut(status=status, database=database, redis=redis)


@router.get("/v1/events", response_class=EventSourceResponse)
async def events(request: Request) -> EventSourceResponse:
    """Server-sent events for the signed-in user (imports, briefs, kits)."""
    token = session_token(request)
    if not token:
        raise AuthenticationError("Please sign in.")
    # Resolve the user with a short-lived session; the stream must not hold a DB connection.
    async with session_factory()() as db:
        user = await AuthService(db).resolve(token)
        await db.commit()
    if user is None:
        raise AuthenticationError("Your session has ended. Please sign in again.")
    user_id = user.id

    async def stream() -> AsyncIterator[dict[str, str]]:
        yield {"event": "ready", "data": "{}"}
        async for event in subscribe(user_id):
            if await request.is_disconnected():
                break
            yield {"event": event["type"], "data": json.dumps(event)}

    return EventSourceResponse(stream(), ping=PING_SECONDS, send_timeout=30)
