"""AI drafts of the portfolio's words: the hero line, the about story, expertise and
project case studies, written from the profile.

The same truth rules as everywhere else: the AI uses only the profile; numbers must
appear in the profile (for a case study, in that project's own facts); tools come
only from the profile's skills. Anything that breaks a rule is left out, never
"fixed" with a guess. Drafts are suggestions: nothing is saved until the owner applies it.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from pydantic import BaseModel, Field

from app.ai.client import get_ai
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.kits.builder import profile_with_ids
from app.modules.kits.checks import numbers_in
from app.modules.matching.signals import canonical
from app.modules.profile.document import ProfileDocument, Project
from app.modules.profile.service import profile_as_text
from app.modules.public_profile.schemas import CaseStudy, Expertise, PortfolioDraft

DRAFT_SYSTEM = """You write the words for a person's portfolio website, from their profile.
It's a personal site, not a CV: warm, specific, in the first person ("I").

Hard rules:
- Use only facts from the profile. Never invent numbers, employers, clients, awards,
  tools or outcomes. If something you'd need isn't in the profile, leave that field
  empty and say what's missing in `needs_input` (for example "the outcome of Project X").
- Plain words, short sentences (under 20 words). No clichés: never "passionate",
  "results-driven", "guru", "ninja", "synergy", "leveraged", "spearheaded", and no
  superlatives the facts don't support.
- Write only the parts asked for below; leave the others empty.

The parts:
- hero_line: 6 to 10 words, what I do and for whom, e.g. "I build AI that banks' staff
  actually use." No name, no title-case.
- about: up to three short paragraphs. 1) what I do now and where. 2) how I got here,
  with one concrete turning point from the profile. 3) what I'm looking for next, only if
  the profile states a goal; otherwise leave it out and add "what you're looking for
  next" to needs_input. Add one personal detail only if the profile lists interests.
- expertise: 3 or 4 areas. title (2 to 4 words); description "I [verb] [thing] so that
  [result]" in one sentence; tools taken only from the profile's skills.
- case_studies: one per project, keyed by its PROJECT id: overview (1 to 2 lines), role
  ("I ..." not "we"), problem, approach (2 to 4 decisions, each with the trade-off),
  outcome (a number only if that project's facts state it; otherwise what the facts
  say happened), lessons only if the profile says so, tools from the skills list.
  A case study uses only that project's own summary and facts. Don't guess the tools,
  methods or reasons behind the work: if the facts don't describe the problem or the
  decisions, leave them empty and add "the problem and key decisions behind <project>"
  to needs_input.
"""

JUDGE_SYSTEM = """You check a portfolio's words for honesty. Each numbered statement says which
source it was written from. A statement is unsupported if it claims anything its source
doesn't say: a tool, method, technical decision, reason, team, scope, award, result or
number. Rewording, summarising and plain first-person framing ("I built ...") are fine.
Return only the unsupported statements, with a short reason. If all are fine, return none.
"""


class _Unsupported(BaseModel):
    index: int
    reason: str = ""


class _Verdict(BaseModel):
    unsupported: list[_Unsupported] = Field(default_factory=list)


CASE_TEXT_FIELDS = ("role", "problem", "outcome", "lessons")
# Without the judge, keep only what restates the facts most closely.
UNJUDGED_SAFE_FIELDS = ("overview", "outcome")

log = get_logger(__name__)

PART_NAMES = {
    "story": "hero_line and about",
    "expertise": "expertise",
    "case_studies": "case_studies",
}


class _CaseOut(BaseModel):
    project_id: str
    overview: str | None = None
    role: str | None = None
    problem: str | None = None
    approach: list[str] = Field(default_factory=list)
    outcome: str | None = None
    lessons: str | None = None
    tools: list[str] = Field(default_factory=list)


class _DraftOut(BaseModel):
    hero_line: str | None = None
    about: list[str] = Field(default_factory=list)
    expertise: list[Expertise] = Field(default_factory=list)
    case_studies: list[_CaseOut] = Field(default_factory=list)
    needs_input: list[str] = Field(default_factory=list)


def _known_numbers(document: ProfileDocument) -> set[str]:
    basics = document.basics
    return numbers_in(
        " ".join([profile_as_text(document), basics.summary or "", basics.headline or ""])
    )


def _project_numbers(project: Project) -> set[str]:
    return numbers_in(" ".join([project.summary or "", *(b.text for b in project.bullets)]))


def _fits(text: str | None, allowed: set[str]) -> bool:
    return text is None or numbers_in(text) <= allowed


def _tools(tools: list[str], skills: dict[str, str]) -> list[str]:
    kept: list[str] = []
    for tool in tools:
        name = skills.get(canonical(tool))
        if name and name not in kept:
            kept.append(name)
    return kept


def _clip(text: str | None, limit: int) -> str | None:
    if not text:
        return None
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def check_draft(raw: _DraftOut, document: ProfileDocument) -> PortfolioDraft:
    """Keep only what the profile supports."""
    known = _known_numbers(document)
    skills = {canonical(s.name): s.name for s in document.skills}
    projects = {p.id: p for p in document.projects}

    hero = raw.hero_line if _fits(raw.hero_line, known) else None
    about = [_clip(p, 600) or "" for p in raw.about if p.strip() and _fits(p, known)][:3]
    expertise = [
        Expertise(
            title=(_clip(area.title, 60) or "")[:60],
            description=_clip(area.description, 260) or "",
            tools=_tools(area.tools, skills)[:8],
        )
        for area in raw.expertise
        if area.title.strip() and _fits(f"{area.title} {area.description}", known)
    ][:4]

    cases: dict[str, CaseStudy] = {}
    for case in raw.case_studies:
        project = projects.get(case.project_id)
        if project is None:
            continue
        allowed = _project_numbers(project)

        def keep(text: str | None, limit: int, allowed: set[str] = allowed) -> str | None:
            return _clip(text, limit) if _fits(text, allowed) else None

        cases[project.id] = CaseStudy(
            overview=keep(case.overview, 320),
            role=keep(case.role, 120),
            problem=keep(case.problem, 900),
            approach=[step for s in case.approach[:5] if (step := keep(s, 400))],
            outcome=keep(case.outcome, 700),
            lessons=keep(case.lessons, 450),
            tools=_tools(case.tools, skills)[:10],
        )
    return PortfolioDraft(
        hero_line=_clip(hero, 90),
        about=about,
        expertise=expertise,
        case_studies=cases,
        needs_input=[_clip(item, 160) or "" for item in raw.needs_input[:8] if item.strip()],
    )


def _project_source(project: Project) -> str:
    lines = [project.name, project.role or "", project.summary or ""]
    lines += [b.text for b in project.bullets]
    return " / ".join(line for line in lines if line)


async def _judge(
    draft: PortfolioDraft, document: ProfileDocument, user_id: uuid.UUID
) -> PortfolioDraft:
    """Drop statements their sources don't support (the about story, case-study claims)."""
    projects = {p.id: p for p in document.projects}
    statements: list[tuple[str, str, str, int]] = []  # (source, text, field, item index)
    for index, paragraph in enumerate(draft.about):
        statements.append(("PROFILE", paragraph, "about", index))
    for project_id, case in draft.case_studies.items():
        for name in CASE_TEXT_FIELDS:
            text = getattr(case, name)
            if text:
                statements.append((project_id, text, name, 0))
        for index, step in enumerate(case.approach):
            statements.append((project_id, step, "approach", index))
    if not statements:
        return draft

    sources = [f"[PROFILE]\n{profile_as_text(document)}"]
    sources += [
        f"[{project_id}]\n{_project_source(projects[project_id])}"
        for project_id in draft.case_studies
        if project_id in projects
    ]
    numbered = "\n".join(
        f"{index}. (from {source}) {text}" for index, (source, text, _, _) in enumerate(statements)
    )
    try:
        verdict = await get_ai().structured(
            [
                {"role": "system", "content": JUDGE_SYSTEM},
                {
                    "role": "user",
                    "content": "SOURCES\n" + "\n\n".join(sources) + f"\n\nSTATEMENTS\n{numbered}",
                },
            ],
            _Verdict,
            purpose="portfolio.judge",
            user_id=user_id,
            temperature=0.0,
            max_tokens=900,
        )
        bad = {item.index for item in verdict.unsupported}
    except AppError as error:
        log.info("portfolio_judge_unavailable", error=error.message)
        return _unjudged(draft)

    dropped_about = {statements[i][3] for i in bad if statements[i][2] == "about"}
    about = [p for index, p in enumerate(draft.about) if index not in dropped_about]
    cases: dict[str, CaseStudy] = {}
    needs = list(draft.needs_input)
    for project_id, case in draft.case_studies.items():
        mine = [i for i in bad if statements[i][0] == project_id]
        fields = {statements[i][2] for i in mine if statements[i][2] != "approach"}
        steps = {statements[i][3] for i in mine if statements[i][2] == "approach"}
        approach = [step for index, step in enumerate(case.approach) if index not in steps]
        changes: dict[str, object] = {name: None for name in fields}
        changes["approach"] = approach
        cases[project_id] = case.model_copy(update=changes)
        if steps and not approach and project_id in projects:
            needs.append(f"the key decisions behind {projects[project_id].name}")
    return draft.model_copy(update={"about": about, "case_studies": cases, "needs_input": needs})


def _unjudged(draft: PortfolioDraft) -> PortfolioDraft:
    """The judge is unavailable: keep case studies to what restates the facts."""
    cases = {
        project_id: CaseStudy(
            overview=case.overview,
            outcome=case.outcome,
            tools=case.tools,
        )
        for project_id, case in draft.case_studies.items()
    }
    return draft.model_copy(update={"case_studies": cases})


def _only(draft: PortfolioDraft, parts: Sequence[str], document: ProfileDocument) -> PortfolioDraft:
    """Keep the parts asked for, so nothing else is judged or asked about.

    Models sometimes write every part anyway; a story draft shouldn't come back
    asking for the decisions behind each project.
    """
    needs = draft.needs_input
    if "case_studies" not in parts:
        keys = [key for project in document.projects for key in (project.id, project.name)]
        needs = [item for item in needs if not any(key and key in item for key in keys)]
    return draft.model_copy(
        update={
            "hero_line": draft.hero_line if "story" in parts else None,
            "about": draft.about if "story" in parts else [],
            "expertise": draft.expertise if "expertise" in parts else [],
            "case_studies": draft.case_studies if "case_studies" in parts else {},
            "needs_input": needs,
        }
    )


async def draft_portfolio(
    document: ProfileDocument,
    parts: Sequence[str],
    user_id: uuid.UUID,
    interests: list[str] | None = None,
) -> PortfolioDraft:
    wanted = ", ".join(PART_NAMES[part] for part in parts)
    interests_line = f"\nINTERESTS: {', '.join(interests)}" if interests else ""
    profile = profile_with_ids(document)
    raw = await get_ai().structured(
        [
            {"role": "system", "content": DRAFT_SYSTEM},
            {
                "role": "user",
                "content": f"Write only: {wanted}.\n\nPROFILE\n{profile}{interests_line}",
            },
        ],
        _DraftOut,
        purpose="portfolio.draft",
        user_id=user_id,
        temperature=0.5,
        max_tokens=3500,
    )
    draft = await _judge(_only(check_draft(raw, document), parts, document), document, user_id)
    names = {project.id: project.name for project in document.projects}
    needs = []
    for item in draft.needs_input:
        for project_id, name in names.items():
            item = item.replace(project_id, name)
        if item not in needs:
            needs.append(item)
    return draft.model_copy(update={"needs_input": needs})
