"""Non-English kits: lines put back to the profile's own (English) wording are translated.

When the truth check restores a line, it uses the fact exactly as the user wrote it,
usually in English. In a Bahasa Malaysia kit that leaves a mixed-language resume, so
those lines get a faithful translation. A translation is kept only if it carries
exactly the same numbers; otherwise the line stays in the user's own words.
Truth beats language.
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel

from app.ai.client import get_ai
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.kits import prompts
from app.modules.kits.checks import FactSource, fact_sources, same_numbers
from app.modules.kits.schemas import FactCheck, TailoredBullet, TailoredResume
from app.modules.profile.document import ProfileDocument

log = get_logger(__name__)


class Translations(BaseModel):
    lines: list[str]


def _all_bullets(resume: TailoredResume) -> list[TailoredBullet]:
    return [b for role in resume.roles for b in role.bullets] + [
        b for project in resume.projects for b in project.bullets
    ]


def _restored(resume: TailoredResume, sources: dict[str, FactSource]) -> list[str]:
    """Lines that are word for word one of the facts they cite, in order, without repeats."""
    lines: list[str] = []
    for bullet in _all_bullets(resume):
        cited = {sources[f].text for f in bullet.fact_ids if f in sources}
        if bullet.text in cited and bullet.text not in lines:
            lines.append(bullet.text)
    return lines


def _faithful(original: str, translated: str) -> bool:
    return bool(translated.strip()) and "[" not in translated and same_numbers(original, translated)


def _swap(resume: TailoredResume, mapping: dict[str, str]) -> TailoredResume:
    def swap(bullets: list[TailoredBullet]) -> list[TailoredBullet]:
        return [b.model_copy(update={"text": mapping.get(b.text, b.text)}) for b in bullets]

    return resume.model_copy(
        update={
            "roles": [r.model_copy(update={"bullets": swap(r.bullets)}) for r in resume.roles],
            "projects": [
                p.model_copy(update={"bullets": swap(p.bullets)}) for p in resume.projects
            ],
        }
    )


async def _translate(lines: list[str], language: str, user_id: uuid.UUID | None) -> list[str]:
    numbered = "\n".join(f"{index}. {line}" for index, line in enumerate(lines, start=1))
    result = await get_ai().structured(
        [
            {
                "role": "system",
                "content": prompts.TRANSLATE_SYSTEM.format(
                    language=prompts.LANGUAGE_NAME.get(language, language)
                ),
            },
            {"role": "user", "content": numbered},
        ],
        Translations,
        purpose="kits.translate",
        user_id=user_id,
        temperature=0.0,
        max_tokens=2000,
    )
    return result.lines


async def localise_restored(
    resume: TailoredResume,
    check: FactCheck,
    document: ProfileDocument,
    language: str,
    *,
    user_id: uuid.UUID | None,
) -> tuple[TailoredResume, FactCheck]:
    """Translate restored lines into the kit's language, keeping only faithful translations."""
    if language == "en":
        return resume, check
    originals = _restored(resume, fact_sources(document))
    if not originals:
        return resume, check
    try:
        translated = await _translate(originals, language, user_id)
    except AppError as error:
        log.info("kit_translate_unavailable", error=error.message)
        return resume, check
    if len(translated) != len(originals):
        log.info("kit_translate_mismatch", sent=len(originals), got=len(translated))
        return resume, check
    mapping = {
        original: text.strip()
        for original, text in zip(originals, translated, strict=True)
        if _faithful(original, text)
    }
    issues = [
        issue.model_copy(
            update={"replaced_with": mapping.get(issue.replaced_with, issue.replaced_with)}
        )
        if issue.replaced_with
        else issue
        for issue in check.issues
    ]
    return _swap(resume, mapping), check.model_copy(update={"issues": issues})
