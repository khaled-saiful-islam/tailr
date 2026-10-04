"""Truth-locked tailoring: deterministic checks that every resume line comes from the profile.

Rules applied to the AI's tailored resume before anyone sees it:
1. A bullet must cite at least one fact of its own role (or project).
2. Every number in a bullet must appear in its cited facts ("40,000" = "40k" = "40000").
3. No unfilled [placeholders].
4. Skills must come from the profile's skill list (others are listed in `skills_removed`).
5. Roles and projects must exist in the profile.
A bullet that breaks a rule is restored to the original fact's wording, and the report says so.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.kits.schemas import (
    FactCheck,
    FactIssue,
    KeywordReport,
    TailoredBullet,
    TailoredResume,
    TailoredRole,
)
from app.modules.matching.signals import canonical
from app.modules.profile.document import Experience, ProfileDocument

# A unit letter only counts when it stands alone: "40k", not the k in "40,000 kakitangan".
_NUMBER = re.compile(r"(\d[\d,.]*)\s*([kKmM](?![A-Za-z])|%|x\b)?")
_PLACEHOLDER = re.compile(r"\[[^\]]{1,40}\]")
# Citation tags the model sometimes writes into the text: "[fact 86801513106b]", "(86801513106b)".
_CITATION = re.compile(
    r"\s*[\[(]\s*(?:facts?\s*:?\s*)?(?:f_)?[0-9a-f]{8,}(?:\s*[,;]\s*(?:f_)?[0-9a-f]{8,})*\s*[\])]",
    re.I,
)


def strip_citations(text: str) -> str:
    return _CITATION.sub("", text).strip()


@dataclass(frozen=True)
class FactSource:
    id: str
    owner_id: str  # experience or project id
    owner: str  # "Senior AI Engineer at Selat Pay"
    text: str


def fact_sources(document: ProfileDocument) -> dict[str, FactSource]:
    sources: dict[str, FactSource] = {}
    for role in document.experiences:
        owner = f"{role.title} at {role.company}"
        for bullet in role.bullets:
            sources[bullet.id] = FactSource(bullet.id, role.id, owner, bullet.text)
    for project in document.projects:
        for bullet in project.bullets:
            sources[bullet.id] = FactSource(
                bullet.id, project.id, f"Project: {project.name}", bullet.text
            )
    return sources


def _numbers(text: str) -> set[str]:
    """Numbers in a canonical form, so 40,000 / 40k / 40000 compare equal."""
    found: set[str] = set()
    for raw, unit in _NUMBER.findall(text):
        cleaned = raw.rstrip(".,").replace(",", "")
        if not cleaned:
            continue
        try:
            value = float(cleaned)
        except ValueError:
            continue
        if unit and unit.lower() == "k":
            value *= 1000
        elif unit and unit.lower() == "m":
            value *= 1_000_000
        shown = f"{int(value):,}" if value.is_integer() else f"{value:g}"
        found.add(f"{shown}{'%' if unit == '%' else ''}")
    return found


def numbers_in(text: str) -> set[str]:
    """The numbers in a text, canonical: "40,000", "40k" and "40000" are all "40,000"."""
    return _numbers(text)


def same_numbers(original: str, rewritten: str) -> bool:
    """True when a rewrite (e.g. a translation) carries exactly the original's numbers."""
    return _numbers(original) == _numbers(rewritten)


def _problem(bullet: TailoredBullet, owner_id: str, sources: dict[str, FactSource]) -> str | None:
    cited = [
        sources[f] for f in bullet.fact_ids if f in sources and sources[f].owner_id == owner_id
    ]
    if not cited:
        return "didn't cite a fact from this role"
    if _PLACEHOLDER.search(bullet.text):
        return "had an unfilled placeholder"
    allowed = set().union(*(_numbers(source.text) for source in cited))
    extra = _numbers(bullet.text) - allowed
    if extra:
        return f"used a number not in your profile ({', '.join(sorted(extra))})"
    return None


def enforce_truth(
    resume: TailoredResume, document: ProfileDocument, judged: set[tuple[str, int]] | None = None
) -> tuple[TailoredResume, FactCheck]:
    """Repair the resume so every line is traceable; report what was changed.

    `judged` lists (owner_id, line index) pairs the AI judge flagged as overclaiming.
    """
    sources = fact_sources(document)
    judged = judged or set()
    role_ids = {role.id: role for role in document.experiences}
    project_ids = {project.id: project for project in document.projects}
    issues: list[FactIssue] = []
    checked = 0

    def repair(
        owner_id: str, owner_label: str, bullets: list[TailoredBullet]
    ) -> list[TailoredBullet]:
        nonlocal checked
        fixed: list[TailoredBullet] = []
        for index, raw in enumerate(bullets):
            checked += 1
            bullet = raw.model_copy(update={"text": strip_citations(raw.text)})
            problem = _problem(bullet, owner_id, sources)
            if problem is None and (owner_id, index) in judged:
                problem = "claimed more than your profile says"
            if problem is None:
                fixed.append(bullet)
                continue
            cited = [
                sources[f]
                for f in bullet.fact_ids
                if f in sources and sources[f].owner_id == owner_id
            ]
            replacement = cited[0].text if cited else None
            issues.append(
                FactIssue(
                    where=f"{owner_label}, line {index + 1}",
                    problem=problem,
                    fixed=True,
                    original=bullet.text,
                    replaced_with=replacement,
                )
            )
            if replacement:
                fixed.append(TailoredBullet(text=replacement, fact_ids=[cited[0].id]))
        return fixed

    roles = []
    for role in resume.roles:
        source_role = role_ids.get(role.experience_id)
        if source_role is None:
            continue
        label = f"{source_role.title} at {source_role.company}"
        bullets = repair(role.experience_id, label, role.bullets)
        if not bullets:  # never leave a role empty: fall back to its own facts
            bullets = [
                TailoredBullet(text=b.text, fact_ids=[b.id]) for b in source_role.bullets[:3]
            ]
        roles.append(role.model_copy(update={"bullets": bullets}))
    # Roles the AI left out come back with their original facts: no hidden history.
    listed = {role.experience_id for role in roles}
    for source_role in document.experiences:
        if source_role.id not in listed:
            roles.append(role_from_profile(source_role))
    order = {role.id: index for index, role in enumerate(document.experiences)}
    roles.sort(key=lambda role: order.get(role.experience_id, 0))

    projects = []
    for project in resume.projects:
        source_project = project_ids.get(project.project_id)
        if source_project is None:
            continue
        bullets = repair(project.project_id, f"Project: {source_project.name}", project.bullets)
        projects.append(project.model_copy(update={"bullets": bullets}))

    known_skills = {canonical(s.name): s.name for s in document.skills}
    skills: list[str] = []
    removed: list[str] = []
    for skill in resume.skills:
        match = known_skills.get(canonical(skill))
        if match and match not in skills:
            skills.append(match)
        elif not match and skill not in removed:
            removed.append(skill)

    cleaned = resume.model_copy(
        update={"roles": roles, "projects": projects, "skills": skills[:16]}
    )
    return cleaned, FactCheck(lines_checked=checked, issues=issues, skills_removed=removed)


def role_from_profile(role: Experience) -> TailoredRole:
    """A role exactly as the profile has it (used when the AI left it out)."""
    return TailoredRole(
        experience_id=role.id,
        bullets=[TailoredBullet(text=b.text, fact_ids=[b.id]) for b in role.bullets[:3]],
    )


def _contains(text: str, skill: str) -> bool:
    words = {canonical(skill), skill.casefold().strip()}
    return any(re.search(rf"(?<!\w){re.escape(w)}(?!\w)", text) for w in words if len(w) > 1)


def resume_text(resume: TailoredResume, document: ProfileDocument | None = None) -> str:
    """Everything the rendered resume says (what ATS software reads)."""
    parts = [resume.headline, resume.summary, *resume.skills]
    titles = {role.id: role.title for role in document.experiences} if document else {}
    projects = {project.id: project.name for project in document.projects} if document else {}
    for role in resume.roles:
        parts.append(titles.get(role.experience_id, ""))
        parts += [b.text for b in role.bullets]
    for project in resume.projects:
        parts.append(projects.get(project.project_id, ""))
        parts += [b.text for b in project.bullets]
    if document:
        parts += [f"{e.qualification or ''} {e.field or ''}" for e in document.education]
        parts += [c.name for c in document.certifications]
    return " ".join(parts).casefold()


def keyword_report(
    job_skills: list[str],
    master_text: str,
    resume: TailoredResume,
    document: ProfileDocument | None = None,
) -> KeywordReport:
    """How many of the job's skills the master profile and the tailored resume show."""
    if not job_skills:
        return KeywordReport(before=0, after=0)
    tailored = resume_text(resume, document)
    master = master_text.casefold()
    before = [s for s in job_skills if _contains(master, s)]
    covered = [s for s in job_skills if _contains(tailored, s)]
    missing = [s for s in job_skills if s not in covered]
    return KeywordReport(
        before=round(100 * len(before) / len(job_skills)),
        after=round(100 * len(covered) / len(job_skills)),
        covered=covered,
        missing=missing,
    )
