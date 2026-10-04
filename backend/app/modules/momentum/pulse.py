"""Market Pulse: what this week's jobs for you ask for, and what they pay.

Built only from the jobs Tailr matched to you, with no AI involved.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from statistics import median

from app.modules.matching.signals import canonical

MIN_JOBS = 3
MIN_SALARIES = 3
TOP_SKILLS = 8
TOP_COMPANIES = 5
GOOD_FIT = 70


@dataclass(frozen=True)
class PulseJob:
    company: str
    work_mode: str | None
    salary_min: int | None
    salary_max: int | None
    skills: Sequence[str]
    score: int


@dataclass(frozen=True)
class SkillDemand:
    name: str
    jobs: int
    share: int  # percent of this week's jobs
    have: bool


@dataclass(frozen=True)
class Pay:
    low: int  # typical monthly floor, RM
    high: int  # typical monthly ceiling, RM
    jobs: int  # how many ads stated pay


@dataclass(frozen=True)
class Pulse:
    jobs: int
    good_fit: int
    skills: list[SkillDemand]
    pay: Pay | None
    modes: dict[str, int]
    companies: list[tuple[str, int]]


def _round(value: float) -> int:
    """Pay to the nearest RM 100, as people quote it."""
    return int(round(value / 100.0) * 100)


def pulse(jobs: Sequence[PulseJob], have: Callable[[str], bool]) -> Pulse | None:
    if len(jobs) < MIN_JOBS:
        return None
    counts: Counter[str] = Counter()
    spellings: dict[str, Counter[str]] = {}
    for job in jobs:
        for key, name in {canonical(s): s.strip() for s in job.skills if s.strip()}.items():
            counts[key] += 1
            spellings.setdefault(key, Counter())[name] += 1
    skills: list[SkillDemand] = []
    for key, count in counts.most_common(TOP_SKILLS):
        if count < 2 and len(jobs) >= 6:  # one ad in many isn't demand
            continue
        name = spellings[key].most_common(1)[0][0]
        share = round(100 * count / len(jobs))
        skills.append(SkillDemand(name=name, jobs=count, share=share, have=have(name)))

    paid = [
        (job.salary_min or job.salary_max or 0, job.salary_max or job.salary_min or 0)
        for job in jobs
        if job.salary_min or job.salary_max
    ]
    pay = (
        Pay(
            low=_round(median(low for low, _ in paid)),
            high=_round(median(high for _, high in paid)),
            jobs=len(paid),
        )
        if len(paid) >= MIN_SALARIES
        else None
    )

    modes = Counter(job.work_mode or "unknown" for job in jobs)
    companies = Counter(job.company.strip() for job in jobs if job.company.strip())
    return Pulse(
        jobs=len(jobs),
        good_fit=sum(1 for job in jobs if job.score >= GOOD_FIT),
        skills=skills,
        pay=pay,
        modes=dict(modes),
        companies=companies.most_common(TOP_COMPANIES),
    )
