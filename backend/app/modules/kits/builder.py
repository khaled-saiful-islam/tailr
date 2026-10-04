"""Build an Apply Kit for one job.

    tailor resume ─┐
    write letter  ─┼─▶ (in parallel) ─▶ AI judge + deterministic checks
    prepare extras ┘
      ─▶ translate restored lines (non-English kits) ─▶ keyword report ─▶ ready

Every stage is saved and announced live. If any part fails, the kit fails with a
message; nothing half-checked is shown.
"""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from app.ai.client import get_ai
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.kits import prompts
from app.modules.kits.checks import enforce_truth, fact_sources, keyword_report
from app.modules.kits.localise import localise_restored
from app.modules.kits.models import Kit
from app.modules.kits.schemas import (
    CoverLetter,
    JudgeVerdict,
    KitExtras,
    TailoredResume,
)
from app.modules.matching.review import job_as_text
from app.modules.matching.signals import profile_signals
from app.modules.notifications.service import notify
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import Profile

log = get_logger(__name__)


def profile_with_ids(document: ProfileDocument) -> str:
    """The profile as the tailoring prompt sees it: every role, project and fact with its id."""
    b = document.basics
    lines = [
        f"NAME: {b.full_name or ''}",
        f"HEADLINE: {b.headline or ''}",
        f"SUMMARY (original): {b.summary or ''}",
    ]
    for role in document.experiences:
        start = f"{role.start.year}" if role.start else "?"
        end = "present" if role.current else (f"{role.end.year}" if role.end else "?")
        lines.append(f"\nROLE {role.id}: {role.title} at {role.company} ({start} to {end})")
        lines += [f"  FACT {bullet.id}: {bullet.text}" for bullet in role.bullets]
    for project in document.projects:
        lines.append(
            f"\nPROJECT {project.id}: {project.name}"
            + (f" ({project.summary})" if project.summary else "")
        )
        lines += [f"  FACT {bullet.id}: {bullet.text}" for bullet in project.bullets]
    if document.education:
        lines.append(
            "\nEDUCATION: "
            + "; ".join(
                f"{e.qualification or ''} {e.field or ''}, {e.institution}"
                for e in document.education
            )
        )
    lines.append("\nSKILLS: " + ", ".join(skill.name for skill in document.skills))
    return "\n".join(lines)


async def _stage(kit_id: uuid.UUID, user_id: uuid.UUID, stage: str) -> None:
    async with session_scope() as db:
        kit = await db.get(Kit, kit_id)
        if kit is not None:
            kit.stage = stage
    await publish(user_id, "kit.progress", {"id": str(kit_id), "stage": stage})


async def judge_lines(
    resume: TailoredResume, document: ProfileDocument, user_id: uuid.UUID
) -> set[tuple[str, int]]:
    """Ask the AI to flag lines that claim more than their facts say."""
    sources = fact_sources(document)
    entries: list[tuple[str, int]] = []
    blocks: list[str] = []
    for owner_id, bullets in [(r.experience_id, r.bullets) for r in resume.roles] + [
        (p.project_id, p.bullets) for p in resume.projects
    ]:
        for index, bullet in enumerate(bullets):
            cited = [sources[f].text for f in bullet.fact_ids if f in sources]
            if not cited:
                continue  # the deterministic check handles uncited lines
            entries.append((owner_id, index))
            facts = "\n".join(f"   source: {text}" for text in cited)
            blocks.append(f"{len(entries) - 1}. {bullet.text}\n{facts}")
    if not blocks:
        return set()
    try:
        verdict = await get_ai().structured(
            [
                {"role": "system", "content": prompts.JUDGE_SYSTEM},
                {"role": "user", "content": "\n\n".join(blocks)},
            ],
            JudgeVerdict,
            purpose="kits.judge",
            user_id=user_id,
            temperature=0.0,
            max_tokens=800,
        )
    except AppError as error:
        log.info("kit_judge_unavailable", error=error.message)
        return set()  # deterministic checks still apply
    return {entries[item.index] for item in verdict.unsupported if 0 <= item.index < len(entries)}


async def run_kit(kit_id: uuid.UUID) -> None:
    async with session_scope() as db:
        kit = await db.get(Kit, kit_id)
        if kit is None or kit.status != "building":
            return
        user_id, language, tone = kit.user_id, kit.language, kit.tone
        job = await db.get(Job, kit.job_id)
        profile = (
            await db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        document = ProfileDocument.model_validate(profile.document) if profile else None
    try:
        if job is None or document is None or not document.experiences:
            raise AppError(
                "Your profile needs at least one role before Tailr can tailor it.",
                code="profile_too_thin",
            )
        language_name = prompts.LANGUAGE_NAME.get(language, "English")
        profile_text = profile_with_ids(document)
        job_text = job_as_text(job, max_chars=4000)
        ai = get_ai()

        await _stage(kit_id, user_id, "tailoring")
        tailor = ai.structured(
            [
                {"role": "system", "content": prompts.TAILOR_SYSTEM.format(language=language_name)},
                {"role": "user", "content": f"PROFILE\n{profile_text}\n\nJOB\n{job_text}"},
            ],
            TailoredResume,
            purpose="kits.tailor",
            user_id=user_id,
            temperature=0.3,
            max_tokens=3500,
        )
        letter = ai.structured(
            [
                {
                    "role": "system",
                    "content": prompts.LETTER_SYSTEM.format(language=language_name, tone=tone),
                },
                {"role": "user", "content": f"PROFILE\n{profile_text}\n\nJOB\n{job_text}"},
            ],
            CoverLetter,
            purpose="kits.letter",
            user_id=user_id,
            temperature=0.5,
            max_tokens=1500,
        )
        extras = ai.structured(
            [
                {"role": "system", "content": prompts.EXTRAS_SYSTEM.format(language=language_name)},
                {"role": "user", "content": f"PROFILE\n{profile_text}\n\nJOB\n{job_text}"},
            ],
            KitExtras,
            purpose="kits.extras",
            user_id=user_id,
            temperature=0.4,
            max_tokens=3000,
        )
        resume, cover_letter, kit_extras = await asyncio.gather(tailor, letter, extras)

        await _stage(kit_id, user_id, "checking")
        judged = await judge_lines(resume, document, user_id)
        resume, fact_check = enforce_truth(resume, document, judged)
        resume, fact_check = await localise_restored(
            resume, fact_check, document, language, user_id=user_id
        )

        insights = JobInsights.model_validate(job.insights) if job.insights else None
        job_skills = (insights.required_skills + insights.nice_skills) if insights else []
        keywords = keyword_report(job_skills, profile_signals(document).text, resume, document)

        async with session_scope() as db:
            kit = await db.get(Kit, kit_id)
            if kit is not None:
                kit.resume = resume.model_dump(mode="json")
                kit.cover_letter = cover_letter.model_dump(mode="json")
                kit.extras = kit_extras.model_dump(mode="json")
                kit.fact_check = fact_check.model_dump(mode="json")
                kit.keywords = keywords.model_dump(mode="json")
                kit.status = "ready"
                kit.stage = "done"
                kit.error = None
                kit.version += 1
        await publish(user_id, "kit.ready", {"id": str(kit_id)})
        await notify(
            user_id,
            kind="kit.ready",
            title=f"Your application for {job.title} is ready",
            body=f"{job.company}. Resume, cover letter and answers, checked against your profile.",
            link=f"/kits/{kit_id}",
        )
        log.info("kit_ready", kit=str(kit_id), issues=len(fact_check.issues))
    except Exception as error:
        message = (
            error.message
            if isinstance(error, AppError)
            else "Something went wrong building your kit."
        )
        if not isinstance(error, AppError):
            log.exception("kit_failed", kit=str(kit_id))
        async with session_scope() as db:
            kit = await db.get(Kit, kit_id)
            if kit is not None:
                kit.status = "failed"
                kit.error = message
        await publish(user_id, "kit.ready", {"id": str(kit_id), "failed": True})
        await notify(
            user_id,
            kind="kit.failed",
            title="Tailr couldn't finish an application",
            body=f"{message} Open it to try again.",
            link=f"/kits/{kit_id}",
        )
