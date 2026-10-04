"""The CV import pipeline, run by a background worker.

queued → reading (text or vision OCR) → understanding (AI extraction) → ready
Every stage is saved and announced as a live event, so the browser can show
progress; a failure is saved with a message the user can act on.
"""

from __future__ import annotations

import asyncio
import uuid

from app.ai.client import get_ai, image_part
from app.core.config import get_settings
from app.core.db import session_scope
from app.core.errors import AppError
from app.core.events import publish
from app.core.logging import get_logger
from app.modules.notifications.service import notify
from app.modules.profile import prompts
from app.modules.profile.document import ProfileDraft, draft_to_document
from app.modules.profile.extraction import Extracted, FileKind, extract
from app.modules.profile.models import CvImport, ImportStatus
from app.storage.files import get_storage

log = get_logger(__name__)

MAX_PROMPT_CHARS = 40_000
MIN_USEFUL_CHARS = 80


class ImportFailedError(Exception):
    """A failure we can explain to the user."""


async def run_import(import_id: uuid.UUID) -> None:
    item = await _load(import_id)
    if item is None or item.status not in {ImportStatus.QUEUED, ImportStatus.FAILED}:
        return  # already handled (a retry or a duplicate message)
    user_id = item.user_id
    try:
        await _set_status(item.id, user_id, ImportStatus.READING)
        data = await get_storage().read(item.file_key)
        extracted = await asyncio.to_thread(extract, data, FileKind(item.file_kind))
        text, used_vision = await _text_of(extracted, user_id)
        if len(text) < MIN_USEFUL_CHARS:
            raise ImportFailedError(
                "We couldn't find enough text in that file. "
                "Try a clearer scan, or paste your CV as text."
            )

        await _set_status(
            item.id, user_id, ImportStatus.UNDERSTANDING, used_vision=used_vision, chars=len(text)
        )
        draft = await get_ai().structured(
            [
                {"role": "system", "content": prompts.EXTRACT_SYSTEM},
                {"role": "user", "content": f"CV text:\n<<<\n{text[:MAX_PROMPT_CHARS]}\n>>>"},
            ],
            ProfileDraft,
            purpose="profile.extract",
            user_id=user_id,
            model=get_settings().llm_model,
            temperature=0.1,
            max_tokens=8000,
        )
        document = draft_to_document(draft)
        if document.is_empty:
            raise ImportFailedError(
                "That file doesn't look like a CV. Upload your resume or paste it as text."
            )

        async with session_scope() as db:
            row = await db.get(CvImport, item.id)
            if row is not None:
                row.draft = document.model_dump(mode="json")
                row.status = ImportStatus.READY
                row.error = None
        await publish(user_id, "profile.import", {"id": str(item.id), "status": ImportStatus.READY})
        await notify(
            user_id,
            kind="cv.read",
            title="Your CV is read",
            body="Check what Tailr found, then save it to your profile.",
            link=f"/profile/import/{item.id}",
        )
        log.info("cv_import_ready", import_id=str(item.id), vision=used_vision, chars=len(text))
    except (ImportFailedError, AppError) as error:
        message = error.message if isinstance(error, AppError) else str(error)
        await _fail(item.id, user_id, message)
    except Exception:
        log.exception("cv_import_crashed", import_id=str(item.id))
        await _fail(item.id, user_id, "Something went wrong reading that CV. Please try again.")


async def _text_of(extracted: Extracted, user_id: uuid.UUID) -> tuple[str, bool]:
    if not extracted.needs_vision:
        return extracted.text, False
    settings = get_settings()
    ai = get_ai()
    pages = await asyncio.gather(
        *(
            ai.complete(
                [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompts.OCR_PROMPT}, image_part(png)],
                    }
                ],
                purpose="profile.ocr",
                user_id=user_id,
                model=settings.llm_vision_model,
                temperature=0.0,
                max_tokens=3000,
            )
            for png in extracted.images
        )
    )
    return "\n\n".join(page.strip() for page in pages if page.strip()), True


async def _load(import_id: uuid.UUID) -> CvImport | None:
    async with session_scope() as db:
        return await db.get(CvImport, import_id)


async def _set_status(
    import_id: uuid.UUID,
    user_id: uuid.UUID,
    status: ImportStatus,
    *,
    used_vision: bool | None = None,
    chars: int | None = None,
) -> None:
    async with session_scope() as db:
        row = await db.get(CvImport, import_id)
        if row is None:
            return
        row.status = status
        if used_vision is not None:
            row.used_vision = used_vision
        if chars is not None:
            row.text_chars = chars
    await publish(user_id, "profile.import", {"id": str(import_id), "status": status})


async def _fail(import_id: uuid.UUID, user_id: uuid.UUID, message: str) -> None:
    async with session_scope() as db:
        row = await db.get(CvImport, import_id)
        if row is not None:
            row.status = ImportStatus.FAILED
            row.error = message
    await publish(user_id, "profile.import", {"id": str(import_id), "status": ImportStatus.FAILED})
    await notify(
        user_id,
        kind="cv.read.failed",
        title="We couldn't read that CV",
        body=message,
        link="/profile/import",
    )
