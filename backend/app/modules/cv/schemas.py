from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.schemas import Schema
from app.modules.kits.schemas import FactCheck, FactRef, SectionRef, TailoredResume

CvTemplate = Literal["meridian", "ledger", "atelier", "monogram", "broadsheet"]
Accent = Literal["ink", "jade", "cobalt", "plum", "crimson", "ochre"]
CvSection = Literal[
    "summary", "experience", "projects", "education", "skills", "certifications", "languages"
]
CvAction = Literal["polish", "one_page", "summary", "translate", "custom"]
Visibility = Literal["off", "link", "public"]

TEMPLATES: tuple[CvTemplate, ...] = ("meridian", "ledger", "atelier", "monogram", "broadsheet")
ACCENTS: dict[str, str] = {
    "ink": "#1f2a44",
    "jade": "#0f6e64",
    "cobalt": "#1d4ed8",
    "plum": "#6b2fa3",
    "crimson": "#b42318",
    "ochre": "#9a6400",
}


class CvOptions(BaseModel):
    """How the CV looks. Content lives in `CvContent`."""

    model_config = ConfigDict(extra="ignore")

    photo_id: uuid.UUID | None = None
    density: Literal["comfortable", "compact"] = "comfortable"
    paper: Literal["A4", "Letter"] = "A4"
    language: Literal["en", "ms"] = "en"
    hidden_sections: list[CvSection] = Field(default_factory=list)
    show_email: bool = True
    # Your own downloads only; a shared CV never shows your phone number.
    show_phone: bool = True


# The CV's words: the same shape as a tailored resume, every line citing profile facts.
CvContent = TailoredResume


class CvOut(Schema):
    template: CvTemplate
    accent: Accent
    options: CvOptions
    content: CvContent
    version: int
    status: Literal["ready", "working", "failed"]
    stage: str | None
    error: str | None
    last_action: str | None
    last_check: FactCheck | None
    can_undo: bool
    # The profile changed since this CV's words were written.
    stale: bool
    visibility: Visibility
    slug: str
    url: str
    published_at: datetime | None
    facts: list[FactRef]
    sections: list[SectionRef]
    updated_at: datetime


class CvUpdate(BaseModel):
    version: int
    template: CvTemplate | None = None
    accent: Accent | None = None
    options: CvOptions | None = None
    content: CvContent | None = None
    visibility: Visibility | None = None


class CvAiRequest(BaseModel):
    action: CvAction
    instruction: str | None = Field(default=None, max_length=300)
    language: Literal["en", "ms"] | None = None


class PublicCv(Schema):
    """What the share page needs around the document itself."""

    slug: str
    url: str
    name: str
    headline: str | None
    document_url: str
    pdf_url: str
    paper: Literal["A4", "Letter"]
    template: CvTemplate
