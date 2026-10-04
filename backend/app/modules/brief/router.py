from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession
from app.modules.brief.models import MatchStatus
from app.modules.brief.schemas import (
    BriefOut,
    MatchDetailOut,
    MatchOut,
    MatchPage,
    MatchUpdate,
    TodayOut,
)
from app.modules.brief.service import BriefService

router = APIRouter(tags=["brief"])


@router.get("/briefs/today", response_model=TodayOut)
async def today(user: CurrentUser, db: DbSession) -> TodayOut:
    """The latest brief with its matches, and when the next one is due."""
    return await BriefService(db).today(user)


@router.post("/briefs/run", response_model=BriefOut, status_code=status.HTTP_202_ACCEPTED)
async def run_now(user: CurrentUser, db: DbSession) -> BriefOut:
    """Build a brief now (or return the one already building)."""
    return await BriefService(db).run_now(user)


@router.get("/briefs/{brief_id}", response_model=BriefOut)
async def get_brief(brief_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BriefOut:
    return await BriefService(db).get(user, brief_id)


@router.get("/matches", response_model=MatchPage)
async def list_matches(
    user: CurrentUser,
    db: DbSession,
    status_filter: MatchStatus | None = Query(default=None, alias="status"),
    min_score: int = Query(default=0, ge=0, le=100),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> MatchPage:
    return await BriefService(db).matches(
        user, status=status_filter, min_score=min_score, limit=limit, offset=offset
    )


@router.get("/matches/{match_id}", response_model=MatchDetailOut)
async def get_match(match_id: uuid.UUID, user: CurrentUser, db: DbSession) -> MatchDetailOut:
    """One job with its full Fit review. Opening a new job marks it seen."""
    return await BriefService(db).match_detail(user, match_id)


@router.patch("/matches/{match_id}", response_model=MatchOut)
async def update_match(
    match_id: uuid.UUID, data: MatchUpdate, user: CurrentUser, db: DbSession
) -> MatchOut:
    return await BriefService(db).update_match(user, match_id, data.status)
