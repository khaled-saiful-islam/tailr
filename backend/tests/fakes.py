"""Fake job sources for tests."""

from __future__ import annotations

from app.modules.sources.base import JobCard, JobDetail, JobRef, SearchQuery, SourceError


class FakeSource:
    def __init__(self, key: str, cards: list[JobCard] | None = None, *, fail: bool = False) -> None:
        self.key = key
        self.label = key.title()
        self.cards = cards or []
        self.fail = fail
        self.queries: list[SearchQuery] = []
        self.details_text: dict[str, str] = {}

    async def search(self, query: SearchQuery) -> list[JobCard]:
        self.queries.append(query)
        if self.fail:
            raise SourceError(self.key, "answered 999")
        return [c for c in self.cards if query.keywords.split()[0].lower() in c.title.lower()]

    async def details(self, ref: JobRef) -> JobDetail:
        if self.fail:
            raise SourceError(self.key, "answered 999")
        return JobDetail(
            source=self.key,
            external_id=ref.external_id,
            description_text=self.details_text.get(ref.external_id, "A great job."),
        )
