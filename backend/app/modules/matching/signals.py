"""Facts about a profile that the Fit score compares against a job."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from app.core.clock import utcnow
from app.modules.profile.document import ProfileDocument

# Common shorthand → one name, so "k8s" in a profile meets "Kubernetes" in an ad.
_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "k8s": "kubernetes",
    "postgres": "postgresql",
    "psql": "postgresql",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "genai": "generative ai",
    "gen ai": "generative ai",
    "llm": "large language models",
    "llms": "large language models",
    "nlp": "natural language processing",
    "cv": "computer vision",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node",
    "node.js": "node",
    "sklearn": "scikit-learn",
    "tf": "tensorflow",
    "gcp": "google cloud",
    "golang": "go",
    "rag": "retrieval-augmented generation",
    "retrieval augmented generation": "retrieval-augmented generation",
    "ci/cd": "ci cd",
    "mlops": "ml ops",
    "aws": "amazon web services",
}


def canonical(skill: str) -> str:
    value = re.sub(r"\s+", " ", skill.casefold().strip())
    value = re.sub(r"[^\w+#./ -]", "", value)
    return _ALIASES.get(value, value)


@dataclass(frozen=True)
class ProfileSignals:
    skills: frozenset[str]
    text: str  # everything the profile says, lower-cased, for evidence look-ups
    years: float
    titles: tuple[str, ...]


def years_of_experience(document: ProfileDocument, today: date | None = None) -> float:
    """Total working time, counting overlapping roles once."""
    today = today or utcnow().date()
    spans: list[tuple[int, int]] = []
    for role in document.experiences:
        if not role.start:
            continue
        start = role.start.year * 12 + (role.start.month or 1) - 1
        if role.current or role.end is None:
            end = today.year * 12 + today.month - 1
        else:
            end = role.end.year * 12 + (role.end.month or 12) - 1
        if end >= start:
            spans.append((start, end))
    spans.sort()
    months = 0
    current: tuple[int, int] | None = None
    for start, end in spans:
        if current and start <= current[1] + 1:
            current = (current[0], max(current[1], end))
        else:
            if current:
                months += current[1] - current[0] + 1
            current = (start, end)
    if current:
        months += current[1] - current[0] + 1
    return round(months / 12, 1)


def profile_signals(document: ProfileDocument) -> ProfileSignals:
    pieces = [document.basics.headline or "", document.basics.summary or ""]
    for role in document.experiences:
        pieces += [role.title, role.summary or "", *(b.text for b in role.bullets)]
    for project in document.projects:
        pieces += [project.name, project.summary or "", *(b.text for b in project.bullets)]
    pieces += [s.name for s in document.skills]
    pieces += [c.name for c in document.certifications]
    text = " ".join(pieces).casefold()
    return ProfileSignals(
        skills=frozenset(canonical(s.name) for s in document.skills),
        text=text,
        years=years_of_experience(document),
        titles=tuple(role.title for role in document.experiences[:3]),
    )


def has_skill(signals: ProfileSignals, skill: str) -> bool:
    """The profile shows this skill: listed, or named in its experience."""
    key = canonical(skill)
    if key in signals.skills:
        return True
    words = {key, skill.casefold().strip()}
    return any(
        re.search(rf"(?<!\w){re.escape(word)}(?!\w)", signals.text)
        for word in words
        if len(word) > 1
    )
