"""A deterministic AI client for tests.

Register answers per purpose:

    fake = FakeAIClient()
    fake.on("profile.extract", lambda messages, schema: ProfileDraft(...))
    set_ai(fake)

Calls are recorded in `fake.calls` so tests can assert on prompts.
"""

from __future__ import annotations

import hashlib
import math
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.errors import UpstreamError

T = TypeVar("T", bound=BaseModel)
Handler = Callable[[list[dict[str, Any]], Any], Any]


@dataclass
class Call:
    kind: str
    purpose: str
    messages: list[dict[str, Any]] = field(default_factory=list)


class FakeAIClient:
    def __init__(self, dimensions: int = 1024) -> None:
        self.dimensions = dimensions
        self.handlers: dict[str, Handler] = {}
        self.calls: list[Call] = []

    def on(self, purpose: str, handler: Handler) -> FakeAIClient:
        self.handlers[purpose] = handler
        return self

    def calls_for(self, purpose: str) -> list[Call]:
        return [call for call in self.calls if call.purpose == purpose]

    async def complete(
        self,
        messages: list[dict[str, Any]],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int = 1200,
    ) -> str:
        self.calls.append(Call("complete", purpose, messages))
        return str(self._handler(purpose)(messages, None))

    async def structured(
        self,
        messages: list[dict[str, Any]],
        schema: type[T],
        *,
        purpose: str,
        user_id: uuid.UUID | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4000,
    ) -> T:
        self.calls.append(Call("structured", purpose, messages))
        result = self._handler(purpose)(messages, schema)
        return result if isinstance(result, schema) else schema.model_validate(result)

    async def embed(
        self, texts: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[list[float]]:
        self.calls.append(Call("embed", purpose))
        return [self._vector(text) for text in texts]

    async def rerank(
        self, query: str, documents: list[str], *, purpose: str, user_id: uuid.UUID | None = None
    ) -> list[float]:
        self.calls.append(Call("rerank", purpose))
        words = set(query.lower().split())
        return [len(words & set(doc.lower().split())) / (len(words) or 1) for doc in documents]

    def _handler(self, purpose: str) -> Handler:
        if purpose not in self.handlers:
            raise UpstreamError(f"FakeAIClient has no handler for '{purpose}'")
        return self.handlers[purpose]

    def _vector(self, text: str) -> list[float]:
        """Stable pseudo-embedding: texts sharing words get similar vectors."""
        vector = [0.0] * self.dimensions
        for word in text.lower().split():
            digest = hashlib.sha256(word.encode()).digest()
            vector[int.from_bytes(digest[:4], "big") % self.dimensions] += 1.0
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]
