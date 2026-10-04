from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import Field, model_validator

from app.api.deps import CurrentUser, DbSession
from app.core.schemas import Schema
from app.modules.background.schemas import TaskOut
from app.modules.background.service import BackgroundService
from app.modules.jobs.paste import precheck_paste

router = APIRouter(prefix="/jobs", tags=["jobs"])


class PasteRequest(Schema):
    url: str | None = Field(default=None, max_length=1000)
    title: str | None = Field(default=None, max_length=300)
    company: str | None = Field(default=None, max_length=300)
    text: str | None = Field(default=None, max_length=40_000)

    @model_validator(mode="after")
    def _something(self) -> PasteRequest:
        if not (self.url or "").strip() and not (self.text or "").strip():
            raise ValueError("Paste a job link or the job description.")
        if self.url and not self.url.startswith(("http://", "https://")):
            raise ValueError("Links start with https://")
        return self


@router.post("/paste", response_model=TaskOut, status_code=status.HTTP_202_ACCEPTED)
async def paste(data: PasteRequest, user: CurrentUser, db: DbSession) -> TaskOut:
    """Add any job by link or text. Quick checks answer now; reading and matching the job
    run in the background (about 15 seconds), and Tailr notifies you when it's on Jobs."""
    fields = {
        "url": (data.url or "").strip() or None,
        "title": (data.title or "").strip() or None,
        "company": (data.company or "").strip() or None,
        "text": data.text,
    }
    await precheck_paste(db, user, **fields)
    title = f"Adding {fields['title']}" if fields["title"] else "Adding a job from a link"
    return await BackgroundService(db).start(user, "job.add", title, fields)
