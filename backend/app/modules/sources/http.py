"""Polite HTTP for job sources.

* One shared client with a browser user agent and short timeouts.
* A per-source rate limit (requests per minute, shared across workers via Redis).
* A small pause with jitter between requests to the same source.
* A circuit breaker: after repeated failures a source rests for a while instead
  of being hammered, and the UI says it's temporarily unavailable.
"""

from __future__ import annotations

import asyncio
import random
from typing import Any

import httpx

from app.core import rate_limit
from app.core.config import get_settings
from app.core.redis import get_redis
from app.modules.sources.base import SourceError

FAILURES_BEFORE_REST = 3
REST_SECONDS = 600

_client: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = httpx.AsyncClient(
            headers={
                "User-Agent": settings.source_user_agent,
                "Accept-Language": "en-MY,en;q=0.9",
            },
            timeout=httpx.Timeout(20.0, connect=8.0),
            follow_redirects=True,
        )
    return _client


def set_client(new_client: httpx.AsyncClient | None) -> None:
    global _client
    _client = new_client


async def is_resting(source: str) -> bool:
    return bool(await get_redis().exists(f"source:rest:{source}"))


async def _record_failure(source: str) -> None:
    redis = get_redis()
    key = f"source:failures:{source}"
    failures = await redis.incr(key)
    await redis.expire(key, REST_SECONDS)
    if failures >= FAILURES_BEFORE_REST:
        await redis.set(f"source:rest:{source}", "1", ex=REST_SECONDS)
        await redis.delete(key)


async def _record_success(source: str) -> None:
    await get_redis().delete(f"source:failures:{source}")


async def fetch(
    source: str,
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    json: Any = None,
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    if await is_resting(source):
        raise SourceError(source, "resting after repeated failures", retryable=False)
    settings = get_settings()
    if (
        await rate_limit.hit(f"source:{source}", limit=0, window_seconds=60)
        > settings.source_requests_per_minute
    ):
        raise SourceError(source, "rate limit reached for this minute")
    await asyncio.sleep(random.uniform(0.15, 0.6))
    try:
        response = await client().request(method, url, params=params, json=json, headers=headers)
    except httpx.HTTPError as error:
        await _record_failure(source)
        raise SourceError(source, f"network error: {type(error).__name__}") from error
    if response.status_code in {403, 429, 999} or response.status_code >= 500:
        await _record_failure(source)
        raise SourceError(source, f"answered {response.status_code}")
    if response.status_code >= 400:
        raise SourceError(source, f"answered {response.status_code}", retryable=False)
    await _record_success(source)
    return response
