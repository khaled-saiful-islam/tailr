from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.schemas import Schema

Visibility = Literal["off", "link", "public"]
Template = Literal["blueprint", "broadsheet", "salon", "poster"]
Appearance = Literal["auto", "light", "dark"]
Availability = Literal["open", "casual", "not_looking"]
Section = Literal[
    "highlights", "projects", "experience", "education", "certifications", "skills", "languages"
]

TEMPLATES: tuple[Template, ...] = ("blueprint", "broadsheet", "salon", "poster")


class Highlight(BaseModel):
    """A number worth leading with, taken from one of the profile's facts."""

    model_config = ConfigDict(str_strip_whitespace=True)

    value: str = Field(min_length=1, max_length=24)  # "40,000"
    label: str = Field(min_length=1, max_length=90)  # "staff use the RAG assistant I built"
    fact_id: str | None = Field(default=None, max_length=40)


class PageSettings(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    photo_id: uuid.UUID | None = None
    availability: Availability = "open"
    availability_note: str | None = Field(default=None, max_length=120)
    contact_email: EmailStr | None = None
    highlights: list[Highlight] = Field(default_factory=list, max_length=4)
    # project id (from the profile document) → image id
    project_images: dict[str, uuid.UUID] = Field(default_factory=dict)
    featured_project_id: str | None = Field(default=None, max_length=40)
    hidden_sections: list[Section] = Field(default_factory=list)
    show_location: bool = True


# ── Owner API ────────────────────────────────────────────────────────────


class ViewDay(Schema):
    day: date
    views: int


class ViewStats(Schema):
    last_30_days: int
    days: list[ViewDay]
    sources: dict[str, int]


class PublicProfileOut(Schema):
    slug: str
    url: str
    visibility: Visibility
    template: Template
    appearance: Appearance
    settings: PageSettings
    version: int
    published_at: datetime | None
    stats: ViewStats
    # What's missing before the page can go live (e.g. "a name", "a role").
    missing: list[str]


class PublicProfileUpdate(BaseModel):
    version: int
    slug: str | None = Field(default=None, max_length=60)
    visibility: Visibility | None = None
    template: Template | None = None
    appearance: Appearance | None = None
    settings: PageSettings | None = None


class SlugCheckOut(Schema):
    slug: str
    available: bool
    reason: str | None


# ── What visitors see ────────────────────────────────────────────────────


class PageLink(Schema):
    label: str
    url: str


class PageExperience(Schema):
    title: str
    company: str
    location: str | None
    start: str | None  # "2023-03" or "2023"
    end: str | None
    current: bool
    summary: str | None
    bullets: list[str]


class PageProject(Schema):
    id: str
    name: str
    role: str | None
    url: str | None
    summary: str | None
    bullets: list[str]
    image_url: str | None
    image_width: int | None
    image_height: int | None
    featured: bool


class PageEducation(Schema):
    institution: str
    qualification: str | None
    field: str | None
    start_year: int | None
    end_year: int | None
    grade: str | None


class PageCertification(Schema):
    name: str
    issuer: str | None
    year: int | None
    url: str | None


class PageSkillGroup(Schema):
    category: Literal["technical", "tool", "domain", "soft"]
    names: list[str]


class PageLanguage(Schema):
    name: str
    proficiency: str | None


class PublicPage(Schema):
    slug: str
    url: str
    template: Template
    appearance: Appearance
    name: str
    headline: str | None
    summary: str | None
    location: str | None
    photo_url: str | None
    availability: Availability
    availability_note: str | None
    has_contact: bool
    links: list[PageLink]
    highlights: list[Highlight]
    experiences: list[PageExperience]
    projects: list[PageProject]
    education: list[PageEducation]
    certifications: list[PageCertification]
    skills: list[PageSkillGroup]
    languages: list[PageLanguage]
    hidden_sections: list[Section]
    cv_url: str
    updated_at: datetime


class ContactOut(Schema):
    email: str
