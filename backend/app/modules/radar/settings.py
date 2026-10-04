"""What a user's job radar looks for, and when it reports back."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.radar.locations import BY_KEY
from app.modules.sources.base import WorkMode

Seniority = Literal["intern", "entry", "mid", "senior", "lead", "manager"]
EmploymentType = Literal["full_time", "part_time", "contract", "internship"]
Freshness = Literal[1, 3, 7]

ALL_SOURCES = ("linkedin", "jobstreet")
DEFAULT_EMPLOYMENT: tuple[EmploymentType, ...] = ("full_time", "contract")
_TIME = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def _tidy_list(values: list[str], *, limit: int, max_length: int = 80) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        value = re.sub(r"\s+", " ", raw).strip()[:max_length]
        if value and value.casefold() not in seen:
            seen.add(value.casefold())
            out.append(value)
    return out[:limit]


class RadarSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    roles: list[str] = Field(
        default_factory=list, description="Job titles to search for (up to 6)."
    )
    anywhere: bool = Field(default=True, description="Anywhere in Malaysia.")
    places: list[str] = Field(
        default_factory=list, description="State keys, used when `anywhere` is off."
    )
    work_modes: list[WorkMode] = Field(default_factory=lambda: list(WorkMode))
    employment_types: list[EmploymentType] = Field(default_factory=lambda: list(DEFAULT_EMPLOYMENT))
    seniority: list[Seniority] = Field(default_factory=list, description="Empty means any level.")
    salary_min: int | None = Field(default=None, ge=0, le=200_000, description="RM per month.")
    include_no_salary: bool = True
    must_have: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    exclude_companies: list[str] = Field(default_factory=list)
    freshness_days: Freshness = 3
    min_fit: int = Field(default=60, ge=30, le=95)
    sources: list[str] = Field(default_factory=lambda: list(ALL_SOURCES))
    brief_time: str = "07:00"
    brief_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    email_brief: bool = True
    paused: bool = False

    @field_validator("roles")
    @classmethod
    def _roles(cls, values: list[str]) -> list[str]:
        return _tidy_list(values, limit=6)

    @field_validator("must_have", "exclude_keywords")
    @classmethod
    def _words(cls, values: list[str]) -> list[str]:
        return _tidy_list(values, limit=20, max_length=40)

    @field_validator("exclude_companies")
    @classmethod
    def _companies(cls, values: list[str]) -> list[str]:
        return _tidy_list(values, limit=50, max_length=120)

    @field_validator("places")
    @classmethod
    def _places(cls, values: list[str]) -> list[str]:
        return [key for key in dict.fromkeys(values) if key in BY_KEY]

    @field_validator("sources")
    @classmethod
    def _sources(cls, values: list[str]) -> list[str]:
        return [key for key in dict.fromkeys(values) if key in ALL_SOURCES]

    @field_validator("brief_time")
    @classmethod
    def _time(cls, value: str) -> str:
        if not _TIME.match(value):
            raise ValueError("Use a 24-hour time such as 07:00.")
        return value

    @field_validator("brief_days")
    @classmethod
    def _days(cls, values: list[int]) -> list[int]:
        days = sorted({day for day in values if 0 <= day <= 6})
        if not days:
            raise ValueError("Pick at least one day for your daily job update.")
        return days

    @field_validator("work_modes")
    @classmethod
    def _modes(cls, values: list[WorkMode]) -> list[WorkMode]:
        if not values:
            raise ValueError("Pick at least one way of working.")
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def _where(self) -> RadarSettings:
        if not self.anywhere and not self.places and WorkMode.REMOTE not in self.work_modes:
            raise ValueError("Pick at least one place, or search anywhere in Malaysia.")
        return self

    @property
    def hour_minute(self) -> tuple[int, int]:
        hour, minute = self.brief_time.split(":")
        return int(hour), int(minute)
