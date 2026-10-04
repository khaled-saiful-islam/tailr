"""The contract every job source implements.

A source turns a `SearchQuery` into `JobCard`s (the summary you see in search
results) and, on request, a `JobRef` into `JobDetail` (the full description).
Server-side sources live in this package; the desktop helper will implement the
same contract from the user's machine.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Protocol

from pydantic import BaseModel, Field


class WorkMode(StrEnum):
    ONSITE = "onsite"
    HYBRID = "hybrid"
    REMOTE = "remote"


class SearchQuery(BaseModel):
    keywords: str = Field(min_length=1, max_length=120)
    location: str = "Malaysia"
    freshness_days: int = Field(default=3, ge=1, le=30)
    limit: int = Field(default=25, ge=1, le=60)

    def cache_key(self) -> str:
        parts = (
            self.keywords.casefold().strip(),
            self.location.casefold(),
            self.freshness_days,
            self.limit,
        )
        return "|".join(str(part) for part in parts)


class JobCard(BaseModel):
    """A job as seen in search results."""

    source: str
    external_id: str
    url: str
    title: str
    company: str
    location: str | None = None
    posted_at: datetime | None = None
    posted_text: str | None = None
    salary_text: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    work_mode: WorkMode | None = None
    employment_type: str | None = None
    snippet: str | None = None
    company_logo: str | None = None


class JobRef(BaseModel):
    source: str
    external_id: str
    url: str


class JobDetail(BaseModel):
    """Everything the source tells us about one job."""

    source: str
    external_id: str
    description_text: str
    description_html: str | None = None
    # Present when the detail page states them (used when a job is pasted by link).
    title: str | None = None
    company: str | None = None
    location: str | None = None
    salary_text: str | None = None
    seniority: str | None = None
    employment_type: str | None = None
    industries: str | None = None
    applicants: str | None = None
    apply_url: str | None = None


class SourceError(Exception):
    """A source couldn't answer (blocked, changed its pages, timed out)."""

    def __init__(self, source: str, message: str, *, retryable: bool = True) -> None:
        super().__init__(f"{source}: {message}")
        self.source = source
        self.message = message
        self.retryable = retryable


class JobSource(Protocol):
    key: str
    label: str

    async def search(self, query: SearchQuery) -> list[JobCard]: ...

    async def details(self, ref: JobRef) -> JobDetail: ...
