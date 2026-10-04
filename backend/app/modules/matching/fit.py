"""The Fit score: how well a profile fits a job, from 0 to 100.

Six parts, each 0 to 100, weighted. Every part is explainable, so the UI can show
a breakdown instead of a black-box number:

    skills 40, role 20, experience 15, location 10, pay 5, overall similarity 10

The quick score uses fast signals for every candidate. For the top jobs, the
AI review (see `review.py`) refines skills and experience with judgement.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, replace

from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.signals import ProfileSignals, has_skill
from app.modules.radar.filters import infer_seniority
from app.modules.radar.locations import places_in
from app.modules.radar.settings import RadarSettings

WEIGHTS = {"skills": 40, "role": 20, "experience": 15, "location": 10, "pay": 5, "similarity": 10}
_LEVELS = ["intern", "entry", "mid", "senior", "lead", "manager"]
_GENERIC = {"senior", "sr", "junior", "jr", "lead", "principal", "staff", "the", "and", "of", "for"}


@dataclass(frozen=True)
class FitParts:
    skills: int
    role: int
    experience: int
    location: int
    pay: int
    similarity: int

    @property
    def score(self) -> int:
        total = sum(getattr(self, name) * weight for name, weight in WEIGHTS.items())
        return max(0, min(100, round(total / 100)))

    def as_dict(self) -> dict[str, int]:
        return {name: getattr(self, name) for name in WEIGHTS}


def cosine(a: list[float] | None, b: list[float] | None) -> float | None:
    if not a or not b:
        return None
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else None


def _skills_part(
    insights: JobInsights | None, signals: ProfileSignals
) -> tuple[int, list[str], list[str]]:
    if not insights or not insights.required_skills:
        return 60, [], []
    matched = [s for s in insights.required_skills if has_skill(signals, s)]
    missing = [s for s in insights.required_skills if s not in matched]
    nice = [s for s in insights.nice_skills if has_skill(signals, s)]
    required_share = len(matched) / len(insights.required_skills)
    nice_share = len(nice) / len(insights.nice_skills) if insights.nice_skills else required_share
    return round(100 * (0.85 * required_share + 0.15 * nice_share)), matched, missing


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9+#]+", text.lower()) if t not in _GENERIC}


def _role_part(job: Job, insights: JobInsights | None, radar: RadarSettings) -> int:
    title = _tokens(job.title)
    score = 75  # every candidate already passed the relevance screen
    if any(_tokens(role) and _tokens(role) <= title for role in radar.roles):
        score = 100
    level = (insights.seniority if insights else None) or infer_seniority(job.title)
    if radar.seniority and level:
        wanted = [_LEVELS.index(lv) for lv in radar.seniority]
        gap = min(abs(_LEVELS.index(level) - w) for w in wanted)
        score -= {0: 0, 1: 12}.get(gap, 30)
    return max(0, score)


def _experience_part(insights: JobInsights | None, years: float) -> int:
    if not insights or insights.min_years is None:
        return 80
    short = insights.min_years - years
    if short <= 0:
        return 100
    if short <= 1:
        return 75
    if short <= 2:
        return 50
    return 25


def _location_part(job: Job, radar: RadarSettings) -> int:
    if radar.anywhere or job.work_mode == "remote":
        return 100
    found = places_in(job.location)
    if not found:
        return 80
    return 100 if found & set(radar.places) else 40


def _pay_part(job: Job, radar: RadarSettings) -> int:
    if not radar.salary_min:
        return 100 if job.salary_max else 80
    if job.salary_max is None:
        return 70
    return 100 if job.salary_max >= radar.salary_min else 30


def _similarity_part(similarity: float | None) -> int:
    if similarity is None:
        return 60
    # bge-m3 cosine for profile↔job sits roughly between 0.35 (unrelated) and 0.75 (very close).
    return max(0, min(100, round((similarity - 0.35) / 0.40 * 100)))


@dataclass(frozen=True)
class QuickFit:
    parts: FitParts
    matched_skills: list[str]
    missing_skills: list[str]
    similarity: float | None


def quick_fit(
    job: Job, signals: ProfileSignals, radar: RadarSettings, profile_vector: list[float] | None
) -> QuickFit:
    insights = JobInsights.model_validate(job.insights) if job.insights else None
    skills, matched, missing = _skills_part(insights, signals)
    similarity = cosine(profile_vector, job.embedding)
    parts = FitParts(
        skills=skills,
        role=_role_part(job, insights, radar),
        experience=_experience_part(insights, signals.years),
        location=_location_part(job, radar),
        pay=_pay_part(job, radar),
        similarity=_similarity_part(similarity),
    )
    return QuickFit(parts, matched, missing, similarity)


def refine(parts: FitParts, *, skill_coverage: int, experience_fit: int) -> FitParts:
    """Blend the AI's judgement into the quick score (the AI reads synonyms and context)."""
    return replace(
        parts,
        skills=round(0.65 * skill_coverage + 0.35 * parts.skills),
        experience=round(0.5 * experience_fit + 0.5 * parts.experience),
    )
