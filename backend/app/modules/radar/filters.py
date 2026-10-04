"""Apply a radar's settings to job cards. Pure functions, no I/O.

Every dropped job is counted under a reason, so the UI can say "12 were older
than 3 days" instead of silently showing fewer jobs. Missing data never drops a
job (a card with no salary passes the salary check unless the user said
otherwise); the brief re-checks with full job details later.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.modules.radar.locations import places_in
from app.modules.radar.settings import RadarSettings, Seniority
from app.modules.sources.base import JobCard, WorkMode

_LEVEL_WORDS: list[tuple[Seniority, re.Pattern[str]]] = [
    (
        "intern",
        re.compile(
            r"\b(intern|internship|trainee|industrial training|praktikal|latihan industri)\b", re.I
        ),
    ),
    (
        "manager",
        re.compile(
            r"\b(manager|head of|director|vp|vice president|chief|cto|ceo|coo|cfo|pengurus)\b", re.I
        ),
    ),
    ("lead", re.compile(r"\b(lead|principal|staff|architect)\b", re.I)),
    ("senior", re.compile(r"\b(senior|sr\.?|snr)\b", re.I)),
    ("entry", re.compile(r"\b(junior|jr\.?|graduate|entry[- ]level|fresh grad(uate)?)\b", re.I)),
]
_UNMARKED_LEVELS: set[Seniority] = {"entry", "mid", "senior"}


def infer_seniority(title: str) -> Seniority | None:
    """The level a title states, or None when it doesn't say."""
    for level, pattern in _LEVEL_WORDS:
        if pattern.search(title):
            return level
    return None


def infer_work_mode(card: JobCard) -> WorkMode | None:
    if card.work_mode:
        return card.work_mode
    text = f"{card.title} {card.location or ''}".lower()
    if "remote" in text or "work from home" in text or "wfh" in text:
        return WorkMode.REMOTE
    if "hybrid" in text:
        return WorkMode.HYBRID
    return None


def _contains_word(text: str, word: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(word)}(?!\w)", text, re.I) is not None


_COMPANY_SUFFIX = re.compile(
    r"\b(sdn\.? bhd\.?|berhad|bhd|pte\.? ltd\.?|ltd|inc|plc|\(m\)|malaysia)\b", re.I
)


def _normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def _normalise_company(name: str) -> str:
    """'SeaOwl Malaysia Sdn. Bhd.' and 'SeaOwl' are the same employer."""
    return _normalise(_COMPANY_SUFFIX.sub("", name))


def duplicate_key(card: JobCard) -> str:
    """Same company + same title = the same job posted on two sites."""
    return f"{_normalise_company(card.company)}|{_normalise(card.title)}"


@dataclass
class FilterResult:
    kept: list[JobCard] = field(default_factory=list)
    dropped: Counter[str] = field(default_factory=Counter)


def reason_to_drop(card: JobCard, settings: RadarSettings, now: datetime) -> str | None:
    if card.posted_at and card.posted_at < now - timedelta(days=settings.freshness_days):
        return "too_old"

    mode = infer_work_mode(card)
    if mode and mode not in settings.work_modes:
        return "work_mode"

    if not settings.anywhere and not (
        mode == WorkMode.REMOTE and WorkMode.REMOTE in settings.work_modes
    ):
        found = places_in(card.location)
        if found and not (found & set(settings.places)):
            return "location"

    if card.employment_type and card.employment_type not in settings.employment_types:
        return "job_type"

    if settings.seniority:
        level = infer_seniority(card.title)
        if level is None:
            if not (_UNMARKED_LEVELS & set(settings.seniority)):
                return "seniority"
        elif level not in settings.seniority:
            return "seniority"

    if settings.salary_min:
        if card.salary_max is not None and card.salary_max < settings.salary_min:
            return "salary"
        if card.salary_max is None and not settings.include_no_salary:
            return "no_salary"

    haystack = f"{card.title} {card.snippet or ''}"
    if any(
        _contains_word(f"{haystack} {card.company}", word) for word in settings.exclude_keywords
    ):
        return "excluded_word"
    if any(
        _normalise_company(name) and _normalise_company(name) in _normalise_company(card.company)
        for name in settings.exclude_companies
    ):
        return "excluded_company"
    if settings.must_have and not any(
        _contains_word(haystack, word) for word in settings.must_have
    ):
        return "missing_must_have"
    return None


def apply_filters(cards: list[JobCard], settings: RadarSettings, now: datetime) -> FilterResult:
    result = FilterResult()
    seen: dict[str, JobCard] = {}
    for card in cards:
        reason = reason_to_drop(card, settings, now)
        if reason:
            result.dropped[reason] += 1
            continue
        key = duplicate_key(card)
        if key in seen:
            result.dropped["duplicate"] += 1
            # Keep the richer listing (one that shows a salary).
            if seen[key].salary_max is None and card.salary_max is not None:
                result.kept[result.kept.index(seen[key])] = card
                seen[key] = card
            continue
        seen[key] = card
        result.kept.append(card)
    return result
