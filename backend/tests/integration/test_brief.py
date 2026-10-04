from __future__ import annotations

from collections.abc import Iterator
from datetime import timedelta
from typing import Any

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.core.clock import utcnow
from app.modules.brief import mailer
from app.modules.brief.models import Brief
from app.modules.brief.tasks import dispatch_due
from app.modules.jobs.insights import JobInsights
from app.modules.matching.review import FitReview, Gap
from app.modules.profile.document import draft_to_document
from app.modules.radar.models import Radar
from app.modules.radar.relevance import Screened
from app.modules.sources import registry
from app.modules.sources.base import JobCard
from tests.factories import sample_draft
from tests.fakes import FakeSource


def _card(source: str, external_id: str, title: str, company: str, **extra: Any) -> JobCard:
    return JobCard(
        source=source,
        external_id=external_id,
        url=f"https://example.com/{source}/{external_id}",
        title=title,
        company=company,
        location=extra.pop("location", "Kuala Lumpur"),
        posted_at=utcnow() - timedelta(hours=3),
        **extra,
    )


@pytest.fixture
def sites() -> Iterator[dict[str, FakeSource]]:
    linkedin = FakeSource(
        "linkedin",
        [
            _card("linkedin", "1", "Senior AI Engineer", "Selat Pay"),
            _card("linkedin", "2", "AI Engineer", "Rimba Health"),
            _card("linkedin", "3", "AI Sales Executive", "Kota Labs"),
        ],
    )
    jobstreet = FakeSource(
        "jobstreet", [_card("jobstreet", "9", "Senior AI Engineer", "Selat Pay Sdn Bhd")]
    )
    linkedin.details_text = {
        "1": "Build RAG with Python and Kubernetes. " * 8,
        "2": "We write everything in Rust and Go. " * 8,
    }
    for key, fake in {"linkedin": linkedin, "jobstreet": jobstreet}.items():
        registry.override(key, fake)
    yield {"linkedin": linkedin, "jobstreet": jobstreet}
    for key in ("linkedin", "jobstreet"):
        registry.override(key, None)


@pytest.fixture
def emails(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    sent: list[dict[str, str]] = []

    async def capture(*, to: str, subject: str, html: str, text: str) -> bool:
        sent.append({"to": to, "subject": subject, "html": html, "text": text})
        return True

    monkeypatch.setattr(mailer, "send_email", capture)
    return sent


@pytest.fixture
def ai(fake_ai: FakeAIClient) -> FakeAIClient:
    def screen(messages: list[dict[str, Any]], schema: Any) -> Screened:
        lines = messages[1]["content"].split("Job titles:\n", 1)[1].splitlines()
        return Screened(relevant=[i for i, line in enumerate(lines) if "Sales" not in line])

    def read(messages: list[dict[str, Any]], schema: Any) -> JobInsights:
        text = messages[1]["content"]
        skills = ["Python", "Kubernetes"] if "RAG" in text else ["Rust", "Go"]
        return JobInsights(summary="An AI role.", required_skills=skills, min_years=3)

    def review(messages: list[dict[str, Any]], schema: Any) -> FitReview:
        strong = "Python" in messages[1]["content"]
        return FitReview(
            headline="Your RAG work fits." if strong else "Different stack.",
            why=["You shipped a RAG assistant."],
            matched=["Python"] if strong else [],
            missing=[] if strong else ["Rust"],
            gaps=[]
            if strong
            else [Gap(text="No Rust", kind="skill", tip="Mention any systems work.")],
            skill_coverage=95 if strong else 10,
            experience_fit=90,
        )

    return (
        fake_ai.on("radar.relevance", screen)
        .on("jobs.insights", read)
        .on("matching.review", review)
    )


async def _ready(client: httpx.AsyncClient, **radar: Any) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    assert (
        await client.put("/api/v1/profile", json={"document": document, "version": 0})
    ).status_code == 200
    settings = {"roles": ["AI Engineer"], "anywhere": True, "min_fit": 60, **radar}
    saved = await client.put("/api/v1/radar", json={"settings": settings, "version": 0})
    assert saved.status_code == 200, saved.text


async def test_today_before_anything(signed_in: httpx.AsyncClient) -> None:
    body = (await signed_in.get("/api/v1/briefs/today")).json()
    assert body == {
        "brief": None,
        "next_brief_at": None,
        "radar_ready": False,
        "profile_ready": False,
    }
    response = await signed_in.post("/api/v1/briefs/run")
    assert response.json()["error"]["code"] == "no_radar"


async def test_run_builds_a_brief_end_to_end(
    signed_in: httpx.AsyncClient,
    sites: dict[str, FakeSource],
    ai: FakeAIClient,
    emails: list[dict[str, str]],
) -> None:
    await _ready(signed_in)
    started = await signed_in.post("/api/v1/briefs/run")
    assert started.status_code == 202, started.text

    today = (await signed_in.get("/api/v1/briefs/today")).json()
    brief = today["brief"]
    assert brief["status"] == "ready", brief
    assert brief["stats"]["found"] == 4
    assert brief["stats"]["on_target"] == 3  # the sales job was screened out
    assert brief["stats"]["matching"] == 2  # the same Selat Pay job on both sites counts once
    titles = [(m["job"]["company"], m["score"]) for m in brief["matches"]]
    assert titles[0][0] == "Selat Pay"
    assert all(score >= 60 for _, score in titles)
    top = brief["matches"][0]
    assert top["review"]["headline"] == "Your RAG work fits."
    assert set(top["parts"]) == {"skills", "role", "experience", "location", "pay", "similarity"}

    assert len(emails) == 1
    assert (
        "fits you this morning" in emails[0]["subject"]
        or "fit you this morning" in emails[0]["subject"]
    )
    assert "Selat Pay" in emails[0]["html"]

    note = (await signed_in.get("/api/v1/notifications")).json()["items"][0]
    assert note["kind"] == "brief.ready"
    assert note["link"] == "/"
    assert note["body"] == "2 jobs measured against your profile. Selat Pay fits best."

    # A second brief never repeats jobs you've already been shown.
    await signed_in.post("/api/v1/briefs/run")
    again = (await signed_in.get("/api/v1/briefs/today")).json()["brief"]
    assert again["id"] != brief["id"]
    assert again["matches"] == []
    assert again["stats"]["new"] == 0


async def test_below_the_bar_still_shows_the_closest(
    signed_in: httpx.AsyncClient,
    sites: dict[str, FakeSource],
    ai: FakeAIClient,
    emails: list[dict[str, str]],
) -> None:
    await _ready(signed_in, min_fit=95)
    await signed_in.post("/api/v1/briefs/run")
    brief = (await signed_in.get("/api/v1/briefs/today")).json()["brief"]
    assert brief["stats"]["below_bar"] is True
    assert 1 <= len(brief["matches"]) <= 3


async def test_match_triage(
    signed_in: httpx.AsyncClient,
    sites: dict[str, FakeSource],
    ai: FakeAIClient,
    emails: list[dict[str, str]],
) -> None:
    await _ready(signed_in)
    await signed_in.post("/api/v1/briefs/run")
    match = (await signed_in.get("/api/v1/briefs/today")).json()["brief"]["matches"][0]

    detail = (await signed_in.get(f"/api/v1/matches/{match['id']}")).json()
    assert detail["description"].startswith("Build RAG")
    assert detail["insights"]["required_skills"] == ["Python", "Kubernetes"]
    assert detail["requirements"] == [
        {"skill": "Python", "have": True},
        {"skill": "Kubernetes", "have": True},
    ]
    assert (await signed_in.get(f"/api/v1/matches/{match['id']}")).json()["status"] == "seen"

    saved = await signed_in.patch(f"/api/v1/matches/{match['id']}", json={"status": "saved"})
    assert saved.json()["status"] == "saved"
    page = (await signed_in.get("/api/v1/matches", params={"status": "saved"})).json()
    assert [item["id"] for item in page["items"]] == [match["id"]]
    assert page["counts"]["saved"] == 1

    await signed_in.patch(f"/api/v1/matches/{match['id']}", json={"status": "dismissed"})
    brief = (await signed_in.get("/api/v1/briefs/today")).json()["brief"]
    assert match["id"] not in [m["id"] for m in brief["matches"]]


async def test_matches_are_private(
    signed_in: httpx.AsyncClient,
    sites: dict[str, FakeSource],
    ai: FakeAIClient,
    emails: list[dict[str, str]],
) -> None:
    await _ready(signed_in)
    await signed_in.post("/api/v1/briefs/run")
    match_id = (await signed_in.get("/api/v1/briefs/today")).json()["brief"]["matches"][0]["id"]
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    assert (await signed_in.get(f"/api/v1/matches/{match_id}")).status_code == 404


async def test_scheduler_dispatches_due_briefs(
    signed_in: httpx.AsyncClient,
    sites: dict[str, FakeSource],
    ai: FakeAIClient,
    emails: list[dict[str, str]],
    db: AsyncSession,
) -> None:
    await _ready(signed_in)
    radar = (await db.execute(select(Radar))).scalar_one()
    radar.next_brief_at = utcnow() - timedelta(minutes=2)
    await db.commit()

    assert await dispatch_due() == 1
    await db.refresh(radar)
    assert radar.next_brief_at is not None
    assert radar.next_brief_at > utcnow()
    briefs = (await db.execute(select(Brief))).scalars().all()
    assert [b.trigger for b in briefs] == ["scheduled"]
    assert await dispatch_due() == 0  # nothing due any more
