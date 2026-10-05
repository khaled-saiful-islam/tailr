from __future__ import annotations

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.core.config import get_settings
from app.modules.auth.models import User
from app.modules.jobs.models import Job
from app.modules.kits.models import Kit
from app.modules.media.models import StoredImage
from app.modules.tracker.models import Application
from app.scripts.demo_data import DEMO_EMAIL, DEMO_SLUG
from app.scripts.demo_jobs import JOBS
from app.scripts.demo_tracker import PLANS
from app.scripts.seed_demo import JOB_PREFIX, seed_demo
from app.storage.files import LocalStorage


async def _count(db: AsyncSession, statement: object) -> int:
    return int(await db.scalar(statement) or 0)  # type: ignore[call-overload]


async def test_demo_seed_fills_every_feature(
    client: httpx.AsyncClient, db: AsyncSession, storage: LocalStorage, fake_ai: FakeAIClient
) -> None:
    first = await seed_demo()
    files_before = await _count(
        db,
        select(func.count()).select_from(StoredImage).where(StoredImage.user_id == first.user_id),
    )
    summary = await seed_demo()  # running it again replaces the account, not duplicates it
    assert summary.user_id != first.user_id

    users = await _count(db, select(func.count()).select_from(User).where(User.email == DEMO_EMAIL))
    jobs = await _count(
        db, select(func.count()).select_from(Job).where(Job.external_id.like(f"{JOB_PREFIX}%"))
    )
    kits = await _count(
        db,
        select(func.count())
        .select_from(Kit)
        .where(Kit.user_id == summary.user_id, Kit.status == "ready"),
    )
    apps = await _count(
        db,
        select(func.count()).select_from(Application).where(Application.user_id == summary.user_id),
    )
    images = await _count(
        db,
        select(func.count()).select_from(StoredImage).where(StoredImage.user_id == summary.user_id),
    )
    assert (users, jobs, kits, apps) == (1, len(JOBS), 2, len(PLANS))
    assert images == files_before == 4  # three covers and one gallery picture
    assert summary.applications == len(PLANS)

    signed = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "demo", "password": get_settings().seed_demo_password},
    )
    assert signed.status_code == 200, signed.text

    today = (await client.get("/api/v1/briefs/today")).json()
    assert today["brief"]["status"] == "ready"
    assert len(today["brief"]["matches"]) == sum(1 for job in JOBS if job.days == 0)
    assert today["profile_ready"]
    assert today["radar_ready"]

    matches = (await client.get("/api/v1/matches")).json()
    assert matches["total"] == len(JOBS)

    kit_list = (await client.get("/api/v1/kits")).json()
    assert {kit["status"] for kit in kit_list} == {"ready"}
    kit = (await client.get(f"/api/v1/kits/{kit_list[0]['id']}")).json()
    facts = {fact["id"] for fact in kit["facts"]}
    cited = {
        fact_id
        for role in kit["resume"]["roles"]
        for bullet in role["bullets"]
        for fact_id in bullet["fact_ids"]
    }
    assert cited
    assert cited <= facts  # every line points at a real fact

    # The application being prepared already has a full interview plan, every story cited.
    plans = [
        (await client.get(f"/api/v1/kits/{item['id']}/interview")).json()["plan"]
        for item in kit_list
    ]
    plan = next(item for item in plans if item)
    assert len(plan["questions"]) >= 8
    assert {question["kind"] for question in plan["questions"]} == {
        "role",
        "experience",
        "motivation",
        "gap",
        "situational",
    }
    stories = {
        fact_id
        for question in plan["questions"]
        if question["story"]
        for fact_id in question["story"]["fact_ids"]
    }
    assert stories <= facts

    cv = (await client.get("/api/v1/cv")).json()
    assert cv["status"] == "ready"

    board = (await client.get("/api/v1/applications")).json()
    stages = {item["stage"] for item in board["items"]}
    assert stages == {"saved", "preparing", "applied", "interview", "offer", "rejected"}

    momentum = (await client.get("/api/v1/momentum")).json()
    assert momentum["goal"]["target"] == 5
    assert momentum["streak"]["checked_today"]
    assert momentum["funnel"]["offer"] == 1

    pulse = (await client.get("/api/v1/momentum/pulse")).json()
    assert pulse["ready"] is True
    assert pulse["pay"] is not None

    page = (await client.get(f"/api/v1/public/profiles/{DEMO_SLUG}")).json()
    assert page["template"] == "blueprint"
    assert page["hero_line"]
    assert len(page["projects"]) == 3
    assert all(project["image_url"] for project in page["projects"])
    assert page["projects"][0]["case"]["approach"]

    inbox = (await client.get("/api/v1/public-profile/messages")).json()
    assert inbox["unread"] == 1
    assert not fake_ai.calls  # no AI anywhere
