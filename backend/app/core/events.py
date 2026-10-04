"""Live events for one user, over Redis pub/sub, streamed to the browser as SSE.

Workers call `publish(user_id, "kit.step", {...})`; the `/api/v1/events`
endpoint subscribes to that user's channel. Events are fire-and-forget hints
that something changed — the UI refetches the real data — so a missed event
never loses state.
"""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from app.core.clock import utcnow
from app.core.logging import get_logger
from app.core.redis import get_redis

log = get_logger(__name__)


def channel_for(user_id: uuid.UUID) -> str:
    return f"events:user:{user_id}"


async def publish(user_id: uuid.UUID, event_type: str, data: dict[str, Any] | None = None) -> None:
    message = json.dumps(
        {"type": event_type, "data": data or {}, "at": utcnow().isoformat()}, default=str
    )
    try:
        await get_redis().publish(channel_for(user_id), message)
    except Exception:  # an event is a hint; never fail the work because of it
        log.warning("event_publish_failed", event_type=event_type)


async def subscribe(user_id: uuid.UUID) -> AsyncIterator[dict[str, Any]]:
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(channel_for(user_id))
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                yield json.loads(message["data"])
            except (TypeError, ValueError):
                continue
    finally:
        await pubsub.unsubscribe(channel_for(user_id))
        await pubsub.aclose()
