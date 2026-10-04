"""The profile document: a person's whole career record, edited as one aggregate.

Stored as validated JSONB (see docs/adr/0002-profile-as-document.md). Every list
item carries a stable `id`, so a tailored resume can cite exactly which bullet
("fact") each of its lines came from.

`*Draft` models are what the AI returns when reading a CV: the same shape
without ids. `draft_to_document` assigns ids.
"""

from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SkillCategory = Literal["technical", "tool", "domain", "soft"]
SkillLevel = Literal["learning", "working", "strong", "expert"]
EmploymentType = Literal["full_time", "part_time", "contract", "internship", "freelance"]
LanguageLevel = Literal["native", "fluent", "professional", "conversational", "basic"]

MAX_EXPERIENCES = 30
MAX_BULLETS = 20
MAX_SKILLS = 120
MAX_ITEMS = 40


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = re.sub(r"\s+", " ", value).strip()
    return value or None


class _Model(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")


class YearMonth(_Model):
    year: int = Field(ge=1950, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)


# ── Draft shapes (AI output: no ids) ─────────────────────────────────────


class BulletDraft(_Model):
    text: str


class LinkDraft(_Model):
    label: str
    url: str


class BasicsDraft(_Model):
    full_name: str | None = None
    headline: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    links: list[LinkDraft] = Field(default_factory=list)


class ExperienceDraft(_Model):
    title: str
    company: str
    location: str | None = None
    employment_type: EmploymentType | None = None
    start: YearMonth | None = None
    end: YearMonth | None = None
    current: bool = False
    summary: str | None = None
    bullets: list[BulletDraft] = Field(default_factory=list)


class EducationDraft(_Model):
    institution: str
    qualification: str | None = None
    field: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    grade: str | None = None
    details: str | None = None


class ProjectDraft(_Model):
    name: str
    role: str | None = None
    url: str | None = None
    summary: str | None = None
    bullets: list[BulletDraft] = Field(default_factory=list)


class SkillDraft(_Model):
    name: str
    category: SkillCategory
    level: SkillLevel | None = None


class CertificationDraft(_Model):
    name: str
    issuer: str | None = None
    issued: YearMonth | None = None
    url: str | None = None


class LanguageDraft(_Model):
    name: str
    proficiency: LanguageLevel | None = None


class ProfileDraft(_Model):
    """What the AI extracts from a CV."""

    basics: BasicsDraft
    experiences: list[ExperienceDraft] = Field(default_factory=list)
    education: list[EducationDraft] = Field(default_factory=list)
    projects: list[ProjectDraft] = Field(default_factory=list)
    skills: list[SkillDraft] = Field(default_factory=list)
    certifications: list[CertificationDraft] = Field(default_factory=list)
    languages: list[LanguageDraft] = Field(default_factory=list)


# ── Document shapes (stored: every item has an id) ───────────────────────


class Bullet(BulletDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=600)


class Link(LinkDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=60)
    url: str = Field(min_length=1, max_length=500)


class Basics(BasicsDraft):
    full_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=120)
    summary: str | None = Field(default=None, max_length=2000)
    links: list[Link] = Field(default_factory=list, max_length=12)  # type: ignore[assignment]


class Experience(ExperienceDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=160)
    company: str = Field(min_length=1, max_length=160)
    summary: str | None = Field(default=None, max_length=1500)
    bullets: list[Bullet] = Field(default_factory=list, max_length=MAX_BULLETS)  # type: ignore[assignment]

    @model_validator(mode="after")
    def _current_has_no_end(self) -> Experience:
        if self.current:
            self.end = None
        return self


class Education(EducationDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    institution: str = Field(min_length=1, max_length=200)


class Project(ProjectDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=160)
    bullets: list[Bullet] = Field(default_factory=list, max_length=MAX_BULLETS)  # type: ignore[assignment]


class Skill(SkillDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=60)


class Certification(CertificationDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=200)


class Language(LanguageDraft):
    id: str = Field(default_factory=new_id, min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=60)


class ProfileDocument(_Model):
    basics: Basics = Field(default_factory=Basics)
    experiences: list[Experience] = Field(default_factory=list, max_length=MAX_EXPERIENCES)
    education: list[Education] = Field(default_factory=list, max_length=MAX_ITEMS)
    projects: list[Project] = Field(default_factory=list, max_length=MAX_ITEMS)
    skills: list[Skill] = Field(default_factory=list, max_length=MAX_SKILLS)
    certifications: list[Certification] = Field(default_factory=list, max_length=MAX_ITEMS)
    languages: list[Language] = Field(default_factory=list, max_length=MAX_ITEMS)

    @field_validator("skills")
    @classmethod
    def _unique_skills(cls, skills: list[Skill]) -> list[Skill]:
        seen: set[str] = set()
        unique = []
        for skill in skills:
            key = skill.name.casefold()
            if key not in seen:
                seen.add(key)
                unique.append(skill)
        return unique

    @model_validator(mode="after")
    def _unique_ids(self) -> ProfileDocument:
        ids = [getattr(item, "id", None) for item in self.all_items()]
        if len(ids) != len(set(ids)):
            raise ValueError("Every item in the profile needs a unique id.")
        return self

    def all_items(self) -> list[BaseModel]:
        items: list[BaseModel] = [*self.basics.links]
        for experience in self.experiences:
            items += [experience, *experience.bullets]
        for project in self.projects:
            items += [project, *project.bullets]
        items += [*self.education, *self.skills, *self.certifications, *self.languages]
        return items

    def facts(self) -> list[tuple[str, str, str]]:
        """Every bullet as (fact id, owner label, text): the evidence tailoring may cite."""
        rows: list[tuple[str, str, str]] = []
        for experience in self.experiences:
            owner = f"{experience.title} at {experience.company}"
            rows += [(bullet.id, owner, bullet.text) for bullet in experience.bullets]
        for project in self.projects:
            owner = f"Project: {project.name}"
            rows += [(bullet.id, owner, bullet.text) for bullet in project.bullets]
        return rows

    @property
    def is_empty(self) -> bool:
        return not (
            self.basics.full_name
            or self.experiences
            or self.education
            or self.skills
            or self.projects
        )


def draft_to_document(draft: ProfileDraft) -> ProfileDocument:
    """Give every extracted item an id and normalise text; drop empty entries."""
    basics = Basics(
        full_name=_clean(draft.basics.full_name),
        headline=_clean(draft.basics.headline),
        email=_clean(draft.basics.email),
        phone=_clean(draft.basics.phone),
        location=_clean(draft.basics.location),
        summary=(draft.basics.summary or "").strip() or None,
        links=[
            Link(label=link.label.strip()[:60] or "Link", url=link.url.strip())
            for link in draft.basics.links
            if link.url.strip()
        ][:12],
    )

    def bullets(items: list[BulletDraft]) -> list[Bullet]:
        return [Bullet(text=text[:600]) for b in items if (text := _clean(b.text))][:MAX_BULLETS]

    return ProfileDocument(
        basics=basics,
        experiences=[
            Experience(**e.model_dump(exclude={"bullets"}), bullets=bullets(e.bullets))
            for e in draft.experiences
            if _clean(e.title) and _clean(e.company)
        ][:MAX_EXPERIENCES],
        education=[Education(**e.model_dump()) for e in draft.education if _clean(e.institution)][
            :MAX_ITEMS
        ],
        projects=[
            Project(**p.model_dump(exclude={"bullets"}), bullets=bullets(p.bullets))
            for p in draft.projects
            if _clean(p.name)
        ][:MAX_ITEMS],
        skills=[Skill(**s.model_dump()) for s in draft.skills if _clean(s.name)][:MAX_SKILLS],
        certifications=[
            Certification(**c.model_dump()) for c in draft.certifications if _clean(c.name)
        ][:MAX_ITEMS],
        languages=[Language(**lang.model_dump()) for lang in draft.languages if _clean(lang.name)][
            :MAX_ITEMS
        ],
    )
