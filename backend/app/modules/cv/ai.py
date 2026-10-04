"""AI edits to a CV: polish, fit one page, rewrite the summary, translate, or your own words.

Every edit goes through the same truth lock as the Apply Kit: lines must cite profile
facts, numbers must match those facts, an AI judge flags overclaiming, and anything
that fails falls back to the person's own words.
"""

from __future__ import annotations

import json
import uuid

from app.ai.client import get_ai
from app.modules.kits.builder import judge_lines, profile_with_ids
from app.modules.kits.checks import enforce_truth, numbers_in
from app.modules.kits.localise import localise_restored
from app.modules.kits.prompts import LANGUAGE_NAME
from app.modules.kits.schemas import FactCheck, TailoredResume
from app.modules.profile.document import ProfileDocument
from app.modules.profile.service import profile_as_text

CV_SYSTEM = """You edit a person's CV. You get their profile (every role, project and fact
with an id) and their current CV. Return the whole CV in the requested shape.

Rules that always apply:
- Use only what the profile says. Never add employers, titles, tools, numbers or results.
- Every line in a role or project cites the fact ids it was written from (`fact_ids`),
  facts from that same role or project only. Never write ids inside the text.
- Keep every number exactly as the fact states it. Don't round, combine or estimate.
- Keep every role. Skip facts that contain a [placeholder].
- Skills come only from the profile's skill list.
- Lines start with a strong verb, say what changed and why it mattered, and fit on one
  or two printed lines. No clichés ("results-driven", "passionate", "synergy",
  "leveraged", "spearheaded"), no first person.
- Write in {language}.

The change to make:
{instruction}
"""

INSTRUCTIONS = {
    "polish": (
        "Polish the whole CV. Return fresh wording, not a copy:\n"
        "- Rewrite every line so the impact comes first where it reads better (for example "
        "'Cut model-serving cost 38% by batching requests and quantising models'), with a "
        "precise verb, the scale (users, staff, money, time) and how it was done.\n"
        "- Remove filler ('responsible for', 'helped to', 'various').\n"
        "- Headline: the role plus two or three real specialties from the profile, "
        "for example 'Senior AI Engineer: RAG, MLOps, recommendation systems'.\n"
        "- Summary: new sentences, 2 to 3, saying who they are (years and field from the "
        "profile), their two strongest results with the profile's own numbers, and what "
        "they're best at. No first person, no clichés."
    ),
    "one_page": (
        "Make the CV fit on one page: keep the strongest 3 lines for the most recent role, "
        "2 for the one before, 1 for older roles and projects; tighten every line; summary "
        "under 45 words; at most 14 skills, most relevant first."
    ),
    "summary": (
        "Write a new headline and summary; return every other part exactly as it is now, "
        "with the same fact ids.\n"
        "- Headline: the role plus two or three real specialties from the profile.\n"
        "- Summary: new sentences, 2 to 3, saying who they are (years and field from the "
        "profile), their two strongest results with the profile's own numbers, and what "
        "they're best at. No first person, no clichés."
    ),
    "translate": (
        "Translate the whole CV into {language}. Keep names, companies, products, "
        "technologies and numbers exactly as they are. Don't add or remove anything."
    ),
}


def instruction_for(action: str, custom: str | None, language: str) -> str:
    if action == "custom":
        return f"{(custom or '').strip()}\n(Apply this only where the profile's facts support it.)"
    return INSTRUCTIONS[action].format(language=LANGUAGE_NAME.get(language, "English"))


def _current(content: TailoredResume) -> str:
    return json.dumps(content.model_dump(mode="json"), ensure_ascii=False, indent=1)


def _safe_summary(
    edited: TailoredResume, before: TailoredResume, document: ProfileDocument
) -> TailoredResume:
    """The summary and headline aren't fact-cited, so their numbers must exist in the profile."""
    basics = document.basics
    known = numbers_in(
        " ".join([profile_as_text(document), basics.summary or "", basics.headline or ""])
    )
    changes = {}
    if not numbers_in(edited.summary) <= known:
        changes["summary"] = before.summary
    if not numbers_in(edited.headline) <= known:
        changes["headline"] = before.headline
    return edited.model_copy(update=changes) if changes else edited


async def improve(
    document: ProfileDocument,
    content: TailoredResume,
    *,
    action: str,
    instruction: str | None,
    language: str,
    user_id: uuid.UUID,
) -> tuple[TailoredResume, FactCheck]:
    system = CV_SYSTEM.format(
        language=LANGUAGE_NAME.get(language, "English"),
        instruction=instruction_for(action, instruction, language),
    )
    edited = await get_ai().structured(
        [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"PROFILE\n{profile_with_ids(document)}\n\nCURRENT CV\n{_current(content)}"
                ),
            },
        ],
        TailoredResume,
        purpose="cv.improve",
        user_id=user_id,
        temperature=0.3,
        max_tokens=3500,
    )
    edited = _safe_summary(edited, content, document)
    judged = await judge_lines(edited, document, user_id)
    cleaned, check = enforce_truth(edited, document, judged)
    return await localise_restored(cleaned, check, document, language, user_id=user_id)
