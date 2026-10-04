from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.core.clock import utcnow
from app.modules.brief.models import Match
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.review import FitReview
from app.modules.profile.document import draft_to_document
from app.modules.tracker.followup import _Draft
from app.modules.tracker.nudges import send_due
from app.modules.tracker.tasks import send_nudges
from tests.factories import sample_draft

AD = "We need an AI engineer who builds RAG systems in Python and runs them on Kubernetes. " * 6


@pytest.fixture
def ai(fake_ai: FakeAIClient) -> FakeAIClient:
    return fake_ai.on(
        "jobs.insights",
        lambda m, s: JobInsights(summary="AI role.", required_skills=["Python", "Kubernetes"]),
    ).on(
        "matching.review",
        lambda m, s: FitReview(
            headline="Good fit.", why=["RAG."], skill_coverage=80, experience_fit=90
        ),
    )


async def _profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    response = await client.put("/api/v1/profile", json={"document": document, "version": 0})
    assert response.status_code == 200


async def _paste(client: httpx.AsyncClient, title: str = "AI Engineer") -> dict[str, Any]:
    response = await client.post(
        "/api/v1/jobs/paste", json={"title": title, "company": "Selat Pay", "text": AD}
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _board(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await client.get("/api/v1/applications")
    assert response.status_code == 200
    return response.json()


async def test_saved_jobs_land_on_the_board_and_move(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    match = await _paste(signed_in)
    board = await _board(signed_in)
    [card] = board["items"]
    assert card["stage"] == "saved"
    assert card["job"]["title"] == "AI Engineer"
    assert card["score"] == match["score"]
    assert board["counts"]["saved"] == 1

    moved = await signed_in.patch(f"/api/v1/applications/{card['id']}", json={"stage": "applied"})
    assert moved.status_code == 200, moved.text
    body = moved.json()
    assert body["stage"] == "applied"
    applied = datetime.fromisoformat(body["applied_at"])
    due = datetime.fromisoformat(body["follow_up_due_at"])
    assert due - applied == timedelta(days=7)

    detail = (await signed_in.get(f"/api/v1/applications/{card['id']}")).json()
    assert [(e["kind"], e["stage"]) for e in detail["events"]] == [
        ("stage", "applied"),
        ("added", "saved"),
    ]
    job = (await signed_in.get(f"/api/v1/matches/{match['id']}")).json()
    assert job["application"]["stage"] == "applied"

    momentum = (await signed_in.get("/api/v1/momentum")).json()
    assert momentum["goal"] == {**momentum["goal"], "target": 5, "done": 1}
    assert momentum["funnel"] == {
        "saved": 1,
        "preparing": 1,
        "applied": 1,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }


async def test_building_a_kit_moves_it_to_preparing(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    match = await _paste(signed_in)
    kit = await signed_in.post("/api/v1/kits", json={"match_id": match["id"]})
    assert kit.status_code == 202, kit.text
    assert kit.json()["application"]["stage"] == "preparing"
    [card] = (await _board(signed_in))["items"]
    assert card["stage"] == "preparing"
    assert card["kit_id"] == kit.json()["id"]


async def test_skipping_an_untouched_job_takes_it_off(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    match = await _paste(signed_in)
    await signed_in.patch(f"/api/v1/matches/{match['id']}", json={"status": "dismissed"})
    assert (await _board(signed_in))["items"] == []

    await signed_in.patch(f"/api/v1/matches/{match['id']}", json={"status": "saved"})
    [card] = (await _board(signed_in))["items"]
    await signed_in.patch(f"/api/v1/applications/{card['id']}", json={"notes": "Ask about visa."})
    await signed_in.patch(f"/api/v1/matches/{match['id']}", json={"status": "dismissed"})
    assert len((await _board(signed_in))["items"]) == 1  # it has notes: it stays


async def test_tracking_from_a_job_and_removing(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    match = await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    removed = await signed_in.delete(f"/api/v1/applications/{card['id']}")
    assert removed.status_code == 204
    assert (await signed_in.get(f"/api/v1/matches/{match['id']}")).json()["status"] == "seen"

    added = await signed_in.post(
        "/api/v1/applications", json={"match_id": match["id"], "stage": "interview"}
    )
    assert added.status_code == 201, added.text
    assert added.json()["stage"] == "interview"
    assert added.json()["applied_at"] is not None


async def test_only_sent_fields_change(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    url = f"/api/v1/applications/{card['id']}"
    when = (utcnow() + timedelta(days=3)).isoformat()
    body = (
        await signed_in.patch(
            url,
            json={
                "next_step": "Technical interview",
                "next_step_at": when,
                "contact_name": " Wei Ling ",
                "contact_email": "weiling@selatpay.my",
                "notes": "  ",
            },
        )
    ).json()
    assert body["next_step"] == "Technical interview"
    assert body["contact_name"] == "Wei Ling"
    assert body["notes"] is None
    cleared = (await signed_in.patch(url, json={"next_step_at": None})).json()
    assert cleared["next_step_at"] is None
    assert cleared["next_step"] == "Technical interview"
    assert cleared["contact_email"] == "weiling@selatpay.my"

    bad = await signed_in.patch(url, json={"contact_email": "not-an-email"})
    assert bad.status_code == 422


async def test_follow_up_draft_and_done(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    url = f"/api/v1/applications/{card['id']}"
    await signed_in.patch(url, json={"stage": "applied"})

    ai.on(
        "tracker.follow_up",
        lambda m, s: _Draft(subject="Hi", body="Hello,\nI tripled revenue 3x.\nNur Aina"),
    )
    draft = (await signed_in.post(f"{url}/follow-up/draft")).json()["follow_up_draft"]
    assert draft["subject"].startswith("Following up on my application")  # the template
    assert "Nur Aina Rahman" in draft["body"]

    done = (await signed_in.post(f"{url}/follow-up/done")).json()
    assert done["followed_up_at"] is not None
    events = (await signed_in.get(url)).json()["events"]
    assert events[0]["kind"] == "followed_up"


async def test_nudges_follow_up_and_next_step(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    url = f"/api/v1/applications/{card['id']}"
    await signed_in.patch(url, json={"stage": "applied"})
    await signed_in.patch(
        url,
        json={
            "applied_at": (utcnow() - timedelta(days=8)).isoformat(),
            "next_step": "Phone screen",
            "next_step_at": (utcnow() + timedelta(hours=3)).isoformat(),
        },
    )
    assert await send_due() == 2
    assert await send_nudges() == 0  # each is sent once (here via the scheduled task)
    notes = (await signed_in.get("/api/v1/notifications")).json()["items"]
    kinds = {note["kind"]: note for note in notes}
    assert kinds["tracker.follow_up"]["title"] == "Follow up with Selat Pay?"
    assert kinds["tracker.follow_up"]["link"] == f"/tracker?open={card['id']}"
    assert kinds["tracker.next_step"]["title"] == "Phone screen: Selat Pay"


async def test_editing_a_next_step_label_does_not_remind_twice(
    signed_in: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    url = f"/api/v1/applications/{card['id']}"
    soon = (utcnow() + timedelta(hours=3)).isoformat()
    await signed_in.patch(url, json={"next_step": "Phone screen", "next_step_at": soon})
    assert await send_due() == 1
    await signed_in.patch(url, json={"next_step": "Phone screen with Wei Ling"})
    await signed_in.patch(url, json={"next_step_at": soon})  # the same time, saved again
    assert await send_due() == 0
    later = (utcnow() + timedelta(hours=5)).isoformat()
    await signed_in.patch(url, json={"next_step_at": later})  # a new time re-arms it
    assert await send_due() == 1
    events = (await signed_in.get(url)).json()["events"]
    assert [e["detail"]["text"] for e in events if e["kind"] == "next_step"] == [
        "Phone screen with Wei Ling",
        "Phone screen with Wei Ling",
        "Phone screen",
    ]


async def test_applications_are_private(
    signed_in: httpx.AsyncClient, client: httpx.AsyncClient, ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    await _paste(signed_in)
    [card] = (await _board(signed_in))["items"]
    await signed_in.post("/api/v1/auth/logout")
    other = await client.post(
        "/api/v1/auth/register",
        json={"name": "Farah", "email": "farah@example.com", "password": "correct-horse-2"},
    )
    assert other.status_code == 201
    url = f"/api/v1/applications/{card['id']}"
    assert (await client.get(url)).status_code == 404
    assert (await client.patch(url, json={"stage": "offer"})).status_code == 404
    assert (await client.delete(url)).status_code == 404


async def test_streak_counts_brief_checks(signed_in: httpx.AsyncClient) -> None:
    before = (await signed_in.get("/api/v1/momentum")).json()["streak"]
    assert before["current"] == 0
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    await signed_in.put("/api/v1/profile", json={"document": document, "version": 0})
    settings = {"roles": ["AI Engineer"], "anywhere": True}
    await signed_in.put("/api/v1/radar", json={"settings": settings, "version": 0})
    await signed_in.get("/api/v1/briefs/today")
    await signed_in.get("/api/v1/briefs/today")  # twice in a day is still one day
    streak = (await signed_in.get("/api/v1/momentum")).json()["streak"]
    assert streak["current"] == 1
    assert streak["checked_today"]
    assert "today" not in {day["state"] for day in streak["week"]}


async def test_weekly_goal(signed_in: httpx.AsyncClient) -> None:
    saved = await signed_in.put("/api/v1/momentum/goal", json={"weekly_applications": 3})
    assert saved.status_code == 200
    assert saved.json()["goal"]["target"] == 3
    again = await signed_in.put("/api/v1/momentum/goal", json={"weekly_applications": 8})
    assert again.json()["goal"]["target"] == 8
    bad = await signed_in.put("/api/v1/momentum/goal", json={"weekly_applications": 0})
    assert bad.status_code == 422


async def test_market_pulse(signed_in: httpx.AsyncClient, db: AsyncSession) -> None:
    me = (await signed_in.get("/api/v1/auth/me")).json()
    empty = (await signed_in.get("/api/v1/momentum/pulse")).json()
    assert empty["ready"] is False
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    await signed_in.put("/api/v1/profile", json={"document": document, "version": 0})

    for index, (low, high) in enumerate([(6000, 9000), (7000, 10000), (6500, 8000)]):
        job = Job(
            source="linkedin",
            external_id=f"pulse-{index}",
            url=f"https://example.com/{index}",
            title="AI Engineer",
            company="Selat Pay" if index < 2 else "Rimba",
            fingerprint=f"pulse-{index}",
            salary_min=low,
            salary_max=high,
            work_mode="hybrid",
            insights=JobInsights(summary="AI.", required_skills=["Python", "Rust"]).model_dump(
                mode="json"
            ),
            first_seen_at=datetime.now(UTC),
            last_seen_at=datetime.now(UTC),
        )
        db.add(job)
        await db.flush()
        db.add(Match(user_id=uuid.UUID(me["id"]), job_id=job.id, score=80, parts={}, status="new"))
    await db.commit()

    pulse = (await signed_in.get("/api/v1/momentum/pulse")).json()
    assert pulse["ready"] is True
    assert pulse["jobs"] == 3
    skills = {skill["name"]: skill for skill in pulse["skills"]}
    assert skills["Python"]["share"] == 100
    assert skills["Python"]["have"] is True
    assert skills["Rust"]["have"] is False
    assert pulse["pay"] == {"low": 6500, "high": 9000, "jobs": 3}
    assert pulse["companies"][0] == {"name": "Selat Pay", "jobs": 2}
    assert pulse["modes"] == {"hybrid": 3}
