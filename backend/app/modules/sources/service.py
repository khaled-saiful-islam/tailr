"""Search job sources with a shared cache and a record of every run.

Many users search for similar roles; the cache means one request to LinkedIn or
JobStreet serves all of them for an hour. Failures never raise to callers:
each source reports its own status so one being down doesn't hide the others.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.db import session_scope
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.modules.sources import registry
from app.modules.sources.base import JobCard, JobDetail, JobRef, SearchQuery, SourceError
from app.modules.sources.models import SourceRun

log = get_logger(__name__)

# Two requests at a time per site: quick enough for a live preview, gentle on the site.
PER_SOURCE_CONCURRENCY = 2


@dataclass
class SourceOutcome:
    source: str
    label: str
    status: str  # ok | failed | off
    cards: list[JobCard] = field(default_factory=list)
    error: str | None = None


def _cache_key(source: str, query: SearchQuery) -> str:
    digest = hashlib.sha256(query.cache_key().encode()).hexdigest()[:24]
    return f"source:search:{source}:{digest}"


@dataclass(frozen=True)
class RunRecord:
    source: str
    kind: str
    query: str
    status: str
    results: int
    duration_ms: int
    error: str | None = None


def _record(
    source: str,
    kind: str,
    query: str,
    status: str,
    results: int,
    started: float,
    error: str | None = None,
) -> RunRecord:
    return RunRecord(
        source=source,
        kind=kind,
        query=query[:300],
        status=status,
        results=results,
        duration_ms=int((time.perf_counter() - started) * 1000),
        error=(error or "")[:2000] or None,
    )


async def save_runs(records: list[RunRecord]) -> None:
    """Write run records in one transaction; logging must never break a search."""
    if not records:
        return
    try:
        async with session_scope() as db:
            db.add_all([SourceRun(**record.__dict__) for record in records])
    except Exception:
        log.warning("source_run_log_failed", count=len(records))


async def search_source(
    source_key: str, query: SearchQuery, runs: list[RunRecord] | None = None
) -> list[JobCard]:
    """One source, one query. Cached; raises SourceError on failure.

    Pass `runs` to collect run records (saved by the caller in one go); otherwise
    they are saved immediately.
    """
    collected: list[RunRecord] = [] if runs is None else runs
    try:
        return await _search_source(source_key, query, collected)
    finally:
        if runs is None:
            await save_runs(collected)


async def _search_source(
    source_key: str, query: SearchQuery, runs: list[RunRecord]
) -> list[JobCard]:
    source = registry.get_source(source_key)
    if source is None:
        raise SourceError(source_key, "switched off", retryable=False)
    redis = get_redis()
    key = _cache_key(source_key, query)
    started = time.perf_counter()
    cached = await redis.get(key)
    if cached:
        cards = [JobCard.model_validate(item) for item in json.loads(cached)]
        runs.append(_record(source_key, "search", query.cache_key(), "cached", len(cards), started))
        return cards
    try:
        cards = await source.search(query)
    except SourceError as error:
        runs.append(
            _record(source_key, "search", query.cache_key(), "failed", 0, started, error.message)
        )
        raise
    await redis.set(
        key,
        json.dumps([card.model_dump(mode="json") for card in cards]),
        ex=get_settings().source_search_cache_seconds,
    )
    runs.append(_record(source_key, "search", query.cache_key(), "ok", len(cards), started))
    return cards


async def search_many(sources: list[str], queries: list[SearchQuery]) -> list[SourceOutcome]:
    """Every query on every requested source, in parallel (two at a time per source)."""
    runs: list[RunRecord] = []

    async def run(source_key: str) -> SourceOutcome:
        label = registry.label_for(source_key)
        if registry.get_source(source_key) is None:
            return SourceOutcome(source_key, label, "off")
        gate = asyncio.Semaphore(PER_SOURCE_CONCURRENCY)

        async def one(query: SearchQuery) -> list[JobCard] | SourceError:
            async with gate:
                try:
                    return await search_source(source_key, query, runs)
                except SourceError as error:
                    return error

        results = await asyncio.gather(*(one(query) for query in queries))
        outcome = SourceOutcome(source_key, label, "ok")
        for result in results:
            if isinstance(result, SourceError):
                outcome.error = result.message
            else:
                outcome.cards += result
        if outcome.error and not outcome.cards:
            outcome.status = "failed"
        return outcome

    outcomes = list(await asyncio.gather(*(run(key) for key in sources)))
    await save_runs(runs)
    return outcomes


async def fetch_details(ref: JobRef) -> JobDetail:
    source = registry.get_source(ref.source)
    if source is None:
        raise SourceError(ref.source, "switched off", retryable=False)
    started = time.perf_counter()
    try:
        detail = await source.details(ref)
    except SourceError as error:
        await save_runs(
            [_record(ref.source, "details", ref.external_id, "failed", 0, started, error.message)]
        )
        raise
    await save_runs([_record(ref.source, "details", ref.external_id, "ok", 1, started)])
    return detail
