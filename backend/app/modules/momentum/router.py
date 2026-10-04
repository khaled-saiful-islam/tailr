"""Momentum routes: goal, streak and funnel; the market pulse."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.modules.momentum.schemas import GoalUpdate, MomentumOut, PulseOut
from app.modules.momentum.service import MomentumService

router = APIRouter(prefix="/momentum", tags=["momentum"])


@router.get("", response_model=MomentumOut)
async def overview(user: CurrentUser, db: DbSession) -> MomentumOut:
    return await MomentumService(db).overview(user)


@router.put("/goal", response_model=MomentumOut)
async def set_goal(data: GoalUpdate, user: CurrentUser, db: DbSession) -> MomentumOut:
    return await MomentumService(db).set_goal(user, data)


@router.get("/pulse", response_model=PulseOut)
async def market_pulse(user: CurrentUser, db: DbSession) -> PulseOut:
    """Skills, pay and work modes across the jobs Tailr matched to you this week."""
    return await MomentumService(db).pulse(user)
