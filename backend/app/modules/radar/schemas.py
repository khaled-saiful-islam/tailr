from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.core.schemas import Schema
from app.modules.radar.settings import RadarSettings, Seniority
from app.modules.sources.base import WorkMode


class PlaceOut(Schema):
    key: str
    label: str


class SourceOptionOut(Schema):
    key: str
    label: str
    available: bool
    note: str | None


class RadarOptionsOut(Schema):
    places: list[PlaceOut]
    sources: list[SourceOptionOut]


class RadarOut(Schema):
    exists: bool
    settings: RadarSettings
    version: int
    next_brief_at: datetime | None
    searches: list[str] = Field(description="The searches the brief will run, in order.")
    updated_at: datetime | None


class RadarUpdate(Schema):
    settings: RadarSettings
    version: int = Field(ge=0)


class RoleSuggestionOut(Schema):
    title: str
    reason: str


class SuggestionsOut(Schema):
    roles: list[RoleSuggestionOut]
    seniority: list[Seniority]


class PreviewJobOut(Schema):
    source: str
    title: str
    company: str
    location: str | None
    url: str
    posted_at: datetime | None
    posted_text: str | None
    salary_text: str | None
    work_mode: WorkMode | None


class PreviewSourceOut(Schema):
    key: str
    label: str
    status: str
    found: int
    matching: int
    error: str | None = None


class PreviewOut(Schema):
    searched_at: datetime
    searches: list[str]
    found: int
    on_target: int
    matching: int
    dropped: dict[str, int]
    sources: list[PreviewSourceOut]
    samples: list[PreviewJobOut]


class PreviewRequest(Schema):
    settings: RadarSettings


# ── AI answer shapes ─────────────────────────────────────────────────────


class RoleIdea(BaseModel):
    title: str
    reason: str


class RoleIdeas(BaseModel):
    roles: list[RoleIdea]
    seniority: list[Seniority]
