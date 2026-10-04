from __future__ import annotations

import uuid

from app.modules.cv.worker import run_improve
from app.worker import broker


@broker.task(task_name="cv.improve")
async def improve_cv(cv_id: str, action: str, instruction: str | None, language: str) -> None:
    """Edit the CV's words with AI, check every line, keep the old words for undo."""
    await run_improve(uuid.UUID(cv_id), action, instruction, language)
