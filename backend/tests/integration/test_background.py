from __future__ import annotations

from typing import Any

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.modules.auth.models import User
from app.modules.background.service import BackgroundService
from app.modules.background.tasks import run_task
from app.modules.profile.document import draft_to_document
from app.modules.profile.schemas import CoachAnswer
from tests.background import done, failed
from tests.factories import sample_draft

PROFILE = "/api/v1/profile"


async def _profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    await client.put(PROFILE, json={"document": document, "version": 0})


def _answer(messages: list[dict[str, Any]], schema: Any) -> CoachAnswer:
    return CoachAnswer(
        suggestion="Built evaluation pipelines that cut regressions.",
        reason="Leads with the action.",
        questions=[],
    )


async def test_tasks_run_in_the_background_and_keep_their_result(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    fake_ai.on("profile.coach", _answer)
    started = await signed_in.post(f"{PROFILE}/coach/bullet", json={"text": "Did evals."})
    result = done(started)
    task_id = started.json()["id"]
    assert result["suggestion"].startswith("Built")

    one = (await signed_in.get(f"/api/v1/tasks/{task_id}")).json()
    assert one["kind"] == "profile.improve_point"
    assert one["title"] == "Improving a point"
    assert one["link"] == "/profile"

    latest = (await signed_in.get("/api/v1/tasks/latest/profile.improve_point")).json()
    assert latest["id"] == task_id

    listing = (await signed_in.get("/api/v1/tasks")).json()
    assert listing["running"] == 0
    assert [item["id"] for item in listing["items"]] == [task_id]


async def test_a_failure_is_kept_with_its_reason(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    await _profile(signed_in)  # no "profile.coach" answer: the AI fails
    message = failed(await signed_in.post(f"{PROFILE}/coach/bullet", json={"text": "Did evals."}))
    assert message


async def test_quick_checks_still_answer_at_once(signed_in: httpx.AsyncClient) -> None:
    thin = await signed_in.post(f"{PROFILE}/coach/summary")
    assert thin.status_code == 422
    assert thin.json()["error"]["code"] == "profile_too_thin"
    for url in ("http://10.0.0.5/job", "http://localhost/job", "http://[::1]/job"):
        await _profile(signed_in)
        response = await signed_in.post("/api/v1/jobs/paste", json={"url": url})
        assert response.status_code == 422, url
        assert response.json()["error"]["code"] == "url_not_allowed"


async def test_tasks_are_private(signed_in: httpx.AsyncClient, client: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    started = await signed_in.post(f"{PROFILE}/coach/summary")
    task_id = started.json()["id"]
    await signed_in.post("/api/v1/auth/logout")
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Farah", "email": "farah@example.com", "password": "correct-horse-2"},
    )
    assert (await client.get(f"/api/v1/tasks/{task_id}")).status_code == 404
    assert (await client.get("/api/v1/tasks")).json()["items"] == []


async def test_running_work_shows_where_it_will_land_and_is_not_started_twice(
    signed_in: httpx.AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def stay_queued(*args: Any, **kwargs: Any) -> None:
        return None

    monkeypatch.setattr(run_task, "kiq", stay_queued)
    user = (await db.execute(select(User).where(User.email == "aina@example.com"))).scalar_one()
    service = BackgroundService(db)
    first = await service.start(user, "profile.summary", "Writing your summary", link="/profile")
    again = await service.start(user, "profile.summary", "Writing your summary", link="/profile")
    assert first.status == "queued"
    assert first.link == "/profile"
    assert again.id == first.id

    listing = (await signed_in.get("/api/v1/tasks")).json()
    assert listing["running"] == 1
    assert listing["items"][0]["link"] == "/profile"
