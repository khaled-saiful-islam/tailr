"""Run an AI edit on a CV in the background, then tell the person it's done."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.db import session_scope
from app.core.errors import AppError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.cv.ai import improve
from app.modules.cv.models import Cv
from app.modules.cv.schemas import CvOptions
from app.modules.kits.schemas import TailoredResume
from app.modules.notifications.service import notify
from app.modules.profile.document import ProfileDocument
from app.modules.profile.models import Profile

log = get_logger(__name__)

DONE = {
    "polish": "Every line polished",
    "one_page": "Trimmed to fit one page",
    "summary": "New headline and summary",
    "translate": "Translated",
    "custom": "Your change applied",
}


async def run_improve(
    cv_id: uuid.UUID, action: str, instruction: str | None, language: str
) -> None:
    async with session_scope() as db:
        cv = await db.get(Cv, cv_id)
        if cv is None or cv.status != "working":
            return
        user_id = cv.user_id
        content = TailoredResume.model_validate(cv.content)
        profile = (
            await db.execute(select(Profile).where(Profile.user_id == user_id))
        ).scalar_one_or_none()
        document = ProfileDocument.model_validate(profile.document) if profile else None
        profile_version = profile.version if profile else 0
    try:
        if document is None:
            raise AppError("Build your profile first.", code="no_profile")
        edited, check = await improve(
            document,
            content,
            action=action,
            instruction=instruction,
            language=language,
            user_id=user_id,
        )
        label = DONE.get(action, "Updated")
        if action == "custom" and instruction:
            label = f'Applied: "{instruction.strip()[:120]}"'
        async with session_scope() as db:
            cv = await db.get(Cv, cv_id)
            if cv is not None:
                cv.previous_content = cv.content
                cv.content = edited.model_dump(mode="json")
                cv.profile_version = max(cv.profile_version, profile_version)
                options = CvOptions.model_validate(cv.options or {})
                if options.language != language:
                    cv.options = options.model_copy(update={"language": language}).model_dump(
                        mode="json"
                    )
                cv.status, cv.stage, cv.error = "ready", None, None
                cv.last_action = label
                cv.last_check = check.model_dump(mode="json")
                cv.version += 1
        await publish(user_id, "cv.ready", {"id": str(cv_id)})
        await notify(
            user_id,
            kind="cv.ready",
            title="Your CV is updated",
            body=f"{label}. Every line was checked against your profile.",
            link="/profile/cv",
        )
    except Exception as error:
        message = error.message if isinstance(error, AppError) else "The AI couldn't edit your CV."
        if not isinstance(error, AppError):
            log.exception("cv_improve_failed", cv=str(cv_id))
        async with session_scope() as db:
            cv = await db.get(Cv, cv_id)
            if cv is not None:
                cv.status, cv.stage, cv.error = "ready", None, message
                cv.version += 1
        await publish(user_id, "cv.ready", {"id": str(cv_id), "failed": True})
        await notify(
            user_id,
            kind="cv.failed",
            title="Your CV wasn't changed",
            body=f"{message} Your CV is as it was.",
            link="/profile/cv",
        )
