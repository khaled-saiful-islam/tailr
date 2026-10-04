from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import Field, model_validator

from app.api.deps import CurrentUser, DbSession
from app.core.schemas import Schema
from app.modules.brief.schemas import MatchDetailOut
from app.modules.brief.service import BriefService
from app.modules.jobs.paste import paste_job

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


@router.post("/paste", response_model=MatchDetailOut, status_code=status.HTTP_201_CREATED)
async def paste(data: PasteRequest, user: CurrentUser, db: DbSession) -> MatchDetailOut:
    """Add any job by link or text; Tailr reads it and measures your fit (takes ~10 seconds)."""
    match_id = await paste_job(
        db,
        user,
        url=(data.url or "").strip() or None,
        title=data.title,
        company=data.company,
        text=data.text,
    )
    return await BriefService(db).match_detail(user, match_id)
