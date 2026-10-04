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
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any

import httpx

from app.core import rate_limit
from app.core.config import get_settings
from app.core.redis import get_redis
from app.modules.sources.base import SourceError

FAILURES_BEFORE_REST = 3
BACKOFF_SECONDS = (4.0, 10.0)

# Background work (morning briefs) may wait for rate-limit budget; previews may not.
_patient: ContextVar[bool] = ContextVar("source_patient", default=False)


@contextmanager
def patient() -> Iterator[None]:
    """Within this block, requests wait for rate-limit budget instead of failing."""
    token = _patient.set(True)
    try:
        yield
    finally:
        _patient.reset(token)


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


async def is_resting(source: str, kind: str = "search") -> bool:
    return bool(await get_redis().exists(f"source:rest:{source}:{kind}"))


async def _record_failure(source: str, kind: str) -> None:
    redis = get_redis()
    key = f"source:failures:{source}:{kind}"
    failures = await redis.incr(key)
    await redis.expire(key, REST_SECONDS)
    if failures >= FAILURES_BEFORE_REST:
        await redis.set(f"source:rest:{source}:{kind}", "1", ex=REST_SECONDS)
        await redis.delete(key)


async def _record_success(source: str, kind: str) -> None:
    await get_redis().delete(f"source:failures:{source}:{kind}")


async def _take_budget(source: str, *, wait: bool) -> None:
    limit = get_settings().source_requests_per_minute
    key = f"source:{source}"
    for _ in range(3):
        if await rate_limit.hit(key, limit=limit, window_seconds=60) <= limit:
            return
        if not wait:
            break
        ttl = await get_redis().ttl(f"ratelimit:{key}")
        await asyncio.sleep(max(1, ttl if ttl and ttl > 0 else 5))
    raise SourceError(source, "rate limit reached for this minute")


async def fetch(
    source: str,
    method: str,
    url: str,
    *,
    kind: str = "search",
    params: dict[str, Any] | None = None,
    json: Any = None,
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    """One request to a job source.

    `kind` ("search" or "details") keeps separate circuit breakers, so trouble
    fetching descriptions never stops searches. Inside `patient()`, a 429 is
    retried after a growing pause.
    """
    if await is_resting(source, kind):
        raise SourceError(source, "resting after repeated failures", retryable=False)
    patient_mode = _patient.get()
    backoffs = BACKOFF_SECONDS if patient_mode else ()
    for attempt in range(len(backoffs) + 1):
        await _take_budget(source, wait=patient_mode)
        await asyncio.sleep(random.uniform(0.15, 0.6))
        try:
            response = await client().request(
                method, url, params=params, json=json, headers=headers
            )
        except httpx.HTTPError as error:
            await _record_failure(source, kind)
            raise SourceError(source, f"network error: {type(error).__name__}") from error
        if response.status_code == 429 and attempt < len(backoffs):
            await asyncio.sleep(backoffs[attempt] + random.uniform(0, 1.5))
            continue
        if response.status_code in {403, 429, 999} or response.status_code >= 500:
            await _record_failure(source, kind)
            raise SourceError(source, f"answered {response.status_code}")
        if response.status_code >= 400:
            raise SourceError(source, f"answered {response.status_code}", retryable=False)
        await _record_success(source, kind)
        return response
    raise SourceError(source, "answered 429")
