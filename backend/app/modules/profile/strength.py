"""Profile Strength: a deterministic, explainable score from 0 to 100.

No AI here on purpose: the score must be instant, stable and easy to explain.
Each check says what is missing and how to fix it. Bullet checks flag weak
achievement lines so the Bullet Coach knows where to help.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.profile.document import Bullet, ProfileDocument

WEAK_OPENERS = (
    "responsible for",
    "worked on",
    "helped",
    "assisted",
    "involved in",
    "tasked with",
    "duties included",
    "in charge of",
)
_PLACEHOLDER = re.compile(r"\[[^\]]{1,40}\]")
_NUMBER = re.compile(
    r"\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand|million)\b",
    re.I,
)


@dataclass(frozen=True)
class Check:
    key: str
    label: str
    weight: int
    done: bool
    hint: str


@dataclass(frozen=True)
class BulletIssue:
    bullet_id: str
    issues: tuple[str, ...]


@dataclass(frozen=True)
class Strength:
    score: int
    checks: tuple[Check, ...]
    bullet_issues: tuple[BulletIssue, ...]


def has_metric(text: str) -> bool:
    return bool(_NUMBER.search(text))


def bullet_issues(bullet: Bullet) -> tuple[str, ...]:
    text = bullet.text.strip()
    words = text.split()
    issues: list[str] = []
    if _PLACEHOLDER.search(text):
        issues.append("placeholder")
    if text.lower().startswith(WEAK_OPENERS):
        issues.append("weak_opener")
    if not has_metric(_PLACEHOLDER.sub("", text)):
        issues.append("no_metric")
    if len(words) < 6:
        issues.append("too_short")
    elif len(words) > 40:
        issues.append("too_long")
    return tuple(issues)


def _word_count(text: str | None) -> int:
    return len((text or "").split())


def score_profile(document: ProfileDocument) -> Strength:
    basics = document.basics
    bullets = [b for e in document.experiences for b in e.bullets] + [
        b for p in document.projects for b in p.bullets
    ]
    quantified = sum(1 for b in bullets if has_metric(b.text))
    latest = document.experiences[0] if document.experiences else None
    summary_words = _word_count(basics.summary)

    checks = (
        Check(
            "identity",
            "Name and headline",
            10,
            bool(basics.full_name and basics.headline),
            "Add a one-line headline, such as “AI Engineer building search and chat products”.",
        ),
        Check(
            "contact",
            "Contact details and location",
            10,
            bool((basics.email or basics.phone) and basics.location),
            "Add an email or phone and your city, so employers know where you are.",
        ),
        Check(
            "summary",
            "A short summary",
            10,
            20 <= summary_words <= 140,
            "Write two or three sentences on what you do and what you are best at.",
        ),
        Check(
            "experience",
            "Work experience with dates",
            15,
            any(e.start for e in document.experiences),
            "Add at least one role with its start date.",
        ),
        Check(
            "achievements",
            "Three or more achievements in your latest role",
            10,
            bool(latest and len(latest.bullets) >= 3),
            "List what you achieved in your latest role, one line each.",
        ),
        Check(
            "metrics",
            "Numbers in your achievements",
            15,
            bool(bullets) and quantified / len(bullets) >= 0.3,
            "Add numbers to at least a third of your achievements: users, revenue, time saved.",
        ),
        Check(
            "skills",
            "Eight or more skills",
            10,
            len(document.skills) >= 8,
            "Add the tools and skills you use. Tailr matches jobs on them.",
        ),
        Check(
            "education",
            "Education",
            10,
            bool(document.education),
            "Add your highest qualification.",
        ),
        Check(
            "links",
            "A link to your work",
            5,
            bool(basics.links),
            "Add LinkedIn, GitHub or a portfolio link.",
        ),
        Check(
            "languages",
            "Languages you speak",
            5,
            bool(document.languages),
            "Add the languages you speak, such as English and Bahasa Malaysia.",
        ),
    )
    score = sum(check.weight for check in checks if check.done)
    issues = tuple(
        BulletIssue(bullet.id, found) for bullet in bullets if (found := bullet_issues(bullet))
    )
    return Strength(score=score, checks=checks, bullet_issues=issues)
