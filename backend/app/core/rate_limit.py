"""Fixed-window rate limiting on Redis.

Used for login attempts, AI endpoints and outbound job-source requests. A
fixed window is simple and good enough at Tailr's volumes.
"""

from __future__ import annotations

from app.core.errors import RateLimitedError
from app.core.redis import get_redis


async def hit(key: str, *, limit: int, window_seconds: int) -> int:
    """Count one hit and return the count in the current window."""
    redis = get_redis()
    full_key = f"ratelimit:{key}"
    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(full_key)
        pipe.expire(full_key, window_seconds, nx=True)
        count, _ = await pipe.execute()
    return int(count)


async def enforce(key: str, *, limit: int, window_seconds: int, message: str) -> None:
    if await hit(key, limit=limit, window_seconds=window_seconds) > limit:
        raise RateLimitedError(message, details={"retry_after_seconds": window_seconds})


async def reset(key: str) -> None:
    await get_redis().delete(f"ratelimit:{key}")
