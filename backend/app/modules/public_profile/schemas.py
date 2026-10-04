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
    "highlights",
    "projects",
    "experience",
    "education",
    "certifications",
    "skills",
    "languages",
    "about",
    "expertise",
    "achievements",
    "testimonials",
    "contact",
]

TEMPLATES: tuple[Template, ...] = ("blueprint", "broadsheet", "salon", "poster")


class Highlight(BaseModel):
    """A number worth leading with, taken from one of the profile's facts."""

    model_config = ConfigDict(str_strip_whitespace=True)

    value: str = Field(min_length=1, max_length=24)  # "40,000"
    label: str = Field(min_length=1, max_length=90)  # "staff use the RAG assistant I built"
    fact_id: str | None = Field(default=None, max_length=40)


class Expertise(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=260)
    tools: list[str] = Field(default_factory=list, max_length=8)


class Award(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=120)
    issuer: str | None = Field(default=None, max_length=120)
    year: int | None = Field(default=None, ge=1950, le=2100)
    detail: str | None = Field(default=None, max_length=220)


class Testimonial(BaseModel):
    """A real recommendation, entered by the owner. Tailr never writes these."""

    model_config = ConfigDict(str_strip_whitespace=True)

    quote: str = Field(min_length=1, max_length=420)
    name: str = Field(min_length=1, max_length=80)
    role: str | None = Field(default=None, max_length=120)
    relationship: str | None = Field(default=None, max_length=120)


class CaseStudy(BaseModel):
    """A project told as a story: the problem, the decisions, the outcome."""

    model_config = ConfigDict(str_strip_whitespace=True)

    overview: str | None = Field(default=None, max_length=320)
    role: str | None = Field(default=None, max_length=120)
    timeline: str | None = Field(default=None, max_length=60)
    team: str | None = Field(default=None, max_length=80)
    problem: str | None = Field(default=None, max_length=900)
    approach: list[str] = Field(default_factory=list, max_length=5)
    outcome: str | None = Field(default=None, max_length=700)
    lessons: str | None = Field(default=None, max_length=450)
    tools: list[str] = Field(default_factory=list, max_length=10)
    gallery: list[uuid.UUID] = Field(default_factory=list, max_length=6)


class PortfolioContent(BaseModel):
    """What makes it a portfolio rather than a CV: the story, in the owner's voice."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    hero_line: str | None = Field(default=None, max_length=90)
    about: list[str] = Field(default_factory=list, max_length=3)
    currently: str | None = Field(default=None, max_length=140)
    interests: list[str] = Field(default_factory=list, max_length=8)
    expertise: list[Expertise] = Field(default_factory=list, max_length=4)
    awards: list[Award] = Field(default_factory=list, max_length=8)
    testimonials: list[Testimonial] = Field(default_factory=list, max_length=3)
    case_studies: dict[str, CaseStudy] = Field(default_factory=dict)
    layout: Literal["one_page", "multi_page"] = "one_page"
    contact_form: bool = True
    # Opt-in "Chat on WhatsApp", common in Malaysia. Digits with country code.
    whatsapp: str | None = Field(default=None, max_length=20, pattern=r"^\+?[0-9 ]{8,20}$")


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
    portfolio: PortfolioContent = Field(default_factory=PortfolioContent)


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


class PageImage(Schema):
    url: str
    width: int
    height: int


class PageCase(Schema):
    overview: str | None
    role: str | None
    timeline: str | None
    team: str | None
    problem: str | None
    approach: list[str]
    outcome: str | None
    lessons: str | None
    tools: list[str]
    gallery: list[PageImage]


class PageProject(Schema):
    id: str
    path: str  # its address under /work/
    name: str
    role: str | None
    url: str | None
    summary: str | None
    bullets: list[str]
    image_url: str | None
    image_width: int | None
    image_height: int | None
    featured: bool
    case: PageCase | None


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
    # The shared CV's PDF, when the owner shares their CV; otherwise no download.
    cv_url: str | None
    updated_at: datetime
    # Portfolio
    hero_line: str | None
    about: list[str]
    currently: str | None
    interests: list[str]
    expertise: list[Expertise]
    awards: list[Award]
    testimonials: list[Testimonial]
    layout: Literal["one_page", "multi_page"]
    contact_form: bool
    whatsapp_url: str | None
    # Signed, time-stamped; the contact form sends it back (spam check).
    form_token: str | None


class ContactOut(Schema):
    email: str


# ── Contact form ─────────────────────────────────────────────────────────

Reason = Literal["job", "freelance", "hello"]


class MessageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    reason: Reason = "job"
    company: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=20, max_length=2000)
    # A field people never see; bots fill it in.
    website: str | None = Field(default=None, max_length=200)
    token: str = Field(default="", max_length=120)


class MessageOut(Schema):
    id: uuid.UUID
    name: str
    email: str
    reason: Reason
    company: str | None
    message: str
    flagged: bool
    read: bool
    created_at: datetime


class MessageSent(Schema):
    sent: bool


class Inbox(Schema):
    items: list[MessageOut]
    unread: int


class PortfolioDraft(Schema):
    """AI suggestions for the portfolio's words. Nothing is saved until the owner applies it."""

    hero_line: str | None = None
    about: list[str] = []
    expertise: list[Expertise] = []
    case_studies: dict[str, CaseStudy] = {}
    # What the AI needed but the profile doesn't say (e.g. "a project's outcome").
    needs_input: list[str] = []


class DraftRequest(BaseModel):
    parts: list[Literal["story", "expertise", "case_studies"]] = Field(min_length=1)
