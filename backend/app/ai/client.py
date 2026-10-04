"""The AI client: chat, structured JSON, vision, embeddings and reranking.

Feature code depends on the `AIClient` protocol and gets the instance from
`get_ai()`. Production uses `IlmuClient` (any OpenAI-compatible endpoint);
tests install `FakeAIClient` with `set_ai()`.
"""

from __future__ import annotations

import asyncio
import base64
import json
import time
import uuid
from datetime import timedelta
from typing import Any, Protocol, TypeVar

import httpx
from pydantic import BaseModel, ValidationError
from sqlalchemy import func, select
from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.ai.models import AiRun
from app.ai.schema import strict_json_schema
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.errors import PermissionDeniedError, RateLimitedError, UpstreamError
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.modules.auth.models import User

log = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)
Message = dict[str, Any]


class AIClient(Protocol):
    async def complete(
        self,
        messages: list[Message],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int = 1200,
    ) -> str: ...

    async def structured(
        self,
        messages: list[Message],
        schema: type[T],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
    ) -> T: ...

    async def embed(
        self, texts: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[list[float]]: ...

    async def rerank(
        self, query: str, documents: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[float]: ...


def image_part(data: bytes, mime: str = "image/png") -> dict[str, Any]:
    """A message content part carrying an image, for vision models."""
    encoded = base64.b64encode(data).decode()
    return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}"}}


def _retryable(error: BaseException) -> bool:
    if isinstance(error, httpx.TimeoutException | httpx.TransportError):
        return True
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code in {408, 409, 429} or error.response.status_code >= 500
    return False


class IlmuClient:
    """OpenAI-compatible client tuned for ILMU, with retries, limits and metering."""

    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self._http = httpx.AsyncClient(
            base_url=settings.llm_base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            timeout=httpx.Timeout(settings.llm_timeout_seconds, connect=10.0),
        )
        self._gate = asyncio.Semaphore(settings.llm_max_concurrency)

    # ── public API ───────────────────────────────────────────────────────

    async def complete(
        self,
        messages: list[Message],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int = 1200,
    ) -> str:
        body = {
            "model": model or self.settings.llm_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        data = await self._post("/chat/completions", body, purpose=purpose, user_id=user_id)
        return _message_text(data)

    async def structured(
        self,
        messages: list[Message],
        schema: type[T],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
    ) -> T:
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__.lower(),
                "strict": True,
                "schema": strict_json_schema(schema),
            },
        }
        conversation = list(messages)
        last_error: Exception | None = None
        # One repair round: show the model what was wrong and ask again.
        for _ in range(2):
            body = {
                "model": model or self.settings.llm_model,
                "messages": conversation,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": response_format,
            }
            data = await self._post("/chat/completions", body, purpose=purpose, user_id=user_id)
            text = _message_text(data)
            try:
                return schema.model_validate_json(_strip_fences(text))
            except (ValidationError, json.JSONDecodeError) as error:
                last_error = error
                conversation = [
                    *messages,
                    {"role": "assistant", "content": text},
                    {
                        "role": "user",
                        "content": "That JSON did not match the required schema "
                        f"({str(error)[:400]}). Reply again with valid JSON only.",
                    },
                ]
        log.warning("ai_structured_invalid", purpose=purpose, error=str(last_error)[:300])
        raise UpstreamError("The AI returned something we couldn't read. Please try again.")

    async def embed(
        self, texts: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[list[float]]:
        if not texts:
            return []
        body = {"model": self.settings.embedding_model, "input": texts}
        data = await self._post("/embeddings", body, purpose=purpose, user_id=user_id)
        rows = sorted(data.get("data", []), key=lambda row: row.get("index", 0))
        return [row["embedding"] for row in rows]

    async def rerank(
        self, query: str, documents: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[float]:
        if not documents:
            return []
        body = {"model": self.settings.rerank_model, "query": query, "documents": documents}
        data = await self._post("/rerank", body, purpose=purpose, user_id=user_id)
        scores = [0.0] * len(documents)
        for result in data.get("results", []):
            scores[int(result["index"])] = float(result["relevance_score"])
        return scores

    async def aclose(self) -> None:
        await self._http.aclose()

    # ── internals ────────────────────────────────────────────────────────

    async def _post(
        self, path: str, body: dict[str, Any], *, purpose: str, user_id: uuid.UUID | None
    ) -> dict[str, Any]:
        if not self.settings.llm_api_key:
            raise UpstreamError(
                "AI is not configured yet. Add LLM_API_KEY to .env.", code="ai_not_configured"
            )
        estimate = _estimate(body)
        reserved = await reserve(user_id, estimate) if user_id is not None else 0
        try:
            return await self._call(path, body, purpose=purpose, user_id=user_id, estimate=estimate)
        finally:
            if user_id is not None:
                await release(user_id, reserved)

    async def _call(
        self,
        path: str,
        body: dict[str, Any],
        *,
        purpose: str,
        user_id: uuid.UUID | None,
        estimate: int,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        model = str(body.get("model", ""))
        try:
            async with self._gate:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(3),
                    wait=wait_exponential_jitter(initial=1, max=12),
                    retry=retry_if_exception(_retryable),
                    reraise=True,
                ):
                    with attempt:
                        response = await self._http.post(path, json=body)
                        response.raise_for_status()
                        data: dict[str, Any] = response.json()
        except httpx.HTTPError as error:
            await _record(purpose, model, user_id, started, None, status="error", error=str(error))
            log.warning("ai_call_failed", purpose=purpose, model=model, error=str(error)[:300])
            raise UpstreamError(
                "The AI service didn't answer. Please try again shortly."
            ) from error
        # A reply without usage still costs something: count the estimate.
        usage = data.get("usage") or {"prompt_tokens": estimate, "completion_tokens": 0}
        await _record(purpose, model, user_id, started, usage, status="ok")
        return data


def _message_text(data: dict[str, Any]) -> str:
    try:
        return str(data["choices"][0]["message"]["content"] or "")
    except (KeyError, IndexError, TypeError) as error:
        raise UpstreamError("The AI returned an empty answer. Please try again.") from error


def _strip_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1].rsplit("```", 1)[0]
    return stripped


async def _record(
    purpose: str,
    model: str,
    user_id: uuid.UUID | None,
    started: float,
    usage: dict[str, Any] | None,
    *,
    status: str,
    error: str | None = None,
) -> None:
    """Meter the call in its own transaction; metering must never break the feature."""
    usage = usage or {}
    try:
        async with session_scope() as db:
            db.add(
                AiRun(
                    user_id=user_id,
                    purpose=purpose,
                    model=model,
                    prompt_tokens=int(usage.get("prompt_tokens") or 0),
                    completion_tokens=int(usage.get("completion_tokens") or 0),
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    status=status,
                    error=(error or "")[:2000] or None,
                )
            )
    except Exception as record_error:
        log.warning("ai_run_record_failed", purpose=purpose, error=str(record_error)[:300])


async def tokens_used_today(user_id: uuid.UUID) -> int:
    since = utcnow() - timedelta(days=1)
    async with session_scope() as db:
        total = await db.scalar(
            select(func.coalesce(func.sum(AiRun.prompt_tokens + AiRun.completion_tokens), 0)).where(
                AiRun.user_id == user_id, AiRun.created_at >= since
            )
        )
    return int(total or 0)


async def allowance(user_id: uuid.UUID) -> tuple[bool, int]:
    """Whether AI is on for this user, and their daily token allowance (0: unlimited)."""
    async with session_scope() as db:
        row = (
            await db.execute(
                select(User.ai_enabled, User.ai_daily_budget).where(User.id == user_id)
            )
        ).first()
    default = get_settings().ai_daily_budget_tokens
    if row is None:
        return True, default
    enabled, budget = row
    return bool(enabled), default if budget is None else int(budget)


INFLIGHT_TTL_SECONDS = 600


def _estimate(body: dict[str, Any]) -> int:
    """A generous guess at a call's tokens: its input plus the most it may write."""
    sent = json.dumps(body.get("messages") or body.get("input") or "", ensure_ascii=False)
    return len(sent) // 3 + int(body.get("max_tokens") or 0)


def _inflight_key(user_id: uuid.UUID) -> str:
    return f"ai:inflight:{user_id}"


async def reserve(user_id: uuid.UUID, estimate: int) -> int:
    """Check AI is on and the allowance has room, holding `estimate` tokens while the call
    runs, so calls made at the same moment can't all slip under the limit. Returns what
    was held (0 when there's no limit)."""
    enabled, budget = await allowance(user_id)
    if not enabled:
        raise PermissionDeniedError(
            "AI features are turned off for your account. Ask your administrator.",
            code="ai_disabled",
        )
    if budget <= 0:
        return 0
    redis = get_redis()
    key = _inflight_key(user_id)
    held = int(await redis.incrby(key, estimate))
    await redis.expire(key, INFLIGHT_TTL_SECONDS)
    used = await tokens_used_today(user_id)
    if used >= budget or (estimate and used + held > budget):
        await redis.decrby(key, estimate)
        raise RateLimitedError(
            "You've used today's AI allowance. It resets within 24 hours.", code="ai_budget"
        )
    return estimate


async def release(user_id: uuid.UUID, held: int) -> None:
    if held:
        await get_redis().decrby(_inflight_key(user_id), held)


async def enforce_daily_budget(user_id: uuid.UUID) -> None:
    """Raise if this user can't use AI now (switched off, or out of allowance)."""
    await release(user_id, await reserve(user_id, 0))


_client: AIClient | None = None


def get_ai() -> AIClient:
    global _client
    if _client is None:
        _client = IlmuClient()
    return _client


def set_ai(client: AIClient | None) -> None:
    """Swap the client (tests install a fake)."""
    global _client
    _client = client
