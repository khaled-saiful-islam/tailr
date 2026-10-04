from __future__ import annotations

from collections.abc import Iterator
from datetime import timedelta
from typing import Any

import httpx
import pytest

from app.ai.fake import FakeAIClient
from app.core.clock import utcnow
from app.modules.profile.document import draft_to_document
from app.modules.radar.schemas import RoleIdea, RoleIdeas
from app.modules.sources import registry
from app.modules.sources.base import JobCard
from tests.background import done
from tests.factories import sample_draft
from tests.fakes import FakeSource

RADAR = "/api/v1/radar"


def _card(source: str, external_id: str, title: str, **extra: Any) -> JobCard:
    return JobCard(
        source=source,
        external_id=external_id,
        url=f"https://example.com/{source}/{external_id}",
        title=title,
        company=extra.pop("company", "Selat Pay"),
        location=extra.pop("location", "Kuala Lumpur"),
        posted_at=extra.pop("posted_at", utcnow() - timedelta(hours=2)),
        **extra,
    )


@pytest.fixture
def sources() -> Iterator[dict[str, FakeSource]]:
    fakes = {
        "linkedin": FakeSource(
            "linkedin",
            [
                _card("linkedin", "1", "Senior AI Engineer"),
                _card("linkedin", "2", "AI Support Engineer", company="Hijau"),
                _card("linkedin", "3", "AI Engineer", company="Rimba", location="Penang"),
            ],
        ),
        "jobstreet": FakeSource(
            "jobstreet",
            [
                _card("jobstreet", "9", "Senior AI Engineer", salary_min=12000, salary_max=15000),
                _card(
                    "jobstreet",
                    "8",
                    "AI Engineer",
                    company="Kota Labs",
                    posted_at=utcnow() - timedelta(days=9),
                ),
            ],
        ),
    }
    for key, fake in fakes.items():
        registry.override(key, fake)
    yield fakes
    for key in fakes:
        registry.override(key, None)


async def _with_profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    response = await client.put("/api/v1/profile", json={"document": document, "version": 0})
    assert response.status_code == 200


async def test_defaults_come_from_profile(signed_in: httpx.AsyncClient) -> None:
    await _with_profile(signed_in)
    body = (await signed_in.get(RADAR)).json()
    assert body["exists"] is False
    assert body["settings"]["roles"] == ["AI Engineer"]
    assert body["settings"]["places"] == ["kuala_lumpur"]
    assert body["searches"] == ["AI Engineer"]
    assert body["next_brief_at"] is not None


async def test_save_versions_and_finishes_onboarding(signed_in: httpx.AsyncClient) -> None:
    await _with_profile(signed_in)
    settings = (await signed_in.get(RADAR)).json()["settings"]
    settings["roles"] = ["AI Engineer", "Machine Learning Engineer"]
    saved = await signed_in.put(RADAR, json={"settings": settings, "version": 0})
    assert saved.status_code == 200, saved.text
    assert saved.json()["version"] == 1
    assert saved.json()["exists"] is True
    assert (await signed_in.get("/api/v1/auth/me")).json()["onboarding_step"] == "done"

    stale = await signed_in.put(RADAR, json={"settings": settings, "version": 0})
    assert stale.status_code == 409

    settings["paused"] = True
    paused = await signed_in.put(RADAR, json={"settings": settings, "version": 1})
    assert paused.json()["next_brief_at"] is None


async def test_save_needs_a_role(signed_in: httpx.AsyncClient) -> None:
    settings = (await signed_in.get(RADAR)).json()["settings"]
    settings["roles"] = []
    response = await signed_in.put(RADAR, json={"settings": settings, "version": 0})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "no_roles"


async def test_options(signed_in: httpx.AsyncClient) -> None:
    body = (await signed_in.get(f"{RADAR}/options")).json()
    assert {"key": "selangor", "label": "Selangor"} in body["places"]
    keys = {s["key"]: s["available"] for s in body["sources"]}
    assert keys == {"linkedin": True, "jobstreet": True, "indeed": False, "glassdoor": False}


async def test_suggestions(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    thin = await signed_in.post(f"{RADAR}/suggest")
    assert thin.status_code == 422
    await _with_profile(signed_in)
    fake_ai.on(
        "radar.suggest",
        lambda messages, schema: RoleIdeas(
            roles=[
                RoleIdea(title="Senior AI Engineer", reason="Your current role."),
                RoleIdea(title="ai engineer", reason="Duplicate."),
                RoleIdea(title="Machine Learning Engineer", reason="Your ML work."),
            ],
            seniority=["senior", "senior", "lead"],
        ),
    )
    body = done(await signed_in.post(f"{RADAR}/suggest"))
    assert [r["title"] for r in body["roles"]] == ["AI Engineer", "Machine Learning Engineer"]
    assert body["seniority"] == ["senior", "lead"]


async def test_preview_searches_screens_and_filters(
    signed_in: httpx.AsyncClient, sources: dict[str, FakeSource], fake_ai: FakeAIClient
) -> None:
    from app.modules.radar.relevance import Screened

    def screen(messages: list[dict[str, Any]], schema: Any) -> Screened:
        listed = messages[1]["content"].split("Job titles:\n", 1)[1].splitlines()
        return Screened(relevant=[i for i, line in enumerate(listed) if "Support" not in line])

    fake_ai.on("radar.relevance", screen)
    settings = {
        "roles": ["AI Engineer"],
        "anywhere": False,
        "places": ["kuala_lumpur"],
        "freshness_days": 3,
    }
    body = done(await signed_in.post(f"{RADAR}/preview", json={"settings": settings}))
    assert body["found"] == 5
    assert body["on_target"] == 4  # the support role is screened out
    assert body["matching"] == 1  # Senior AI Engineer at Selat Pay, seen on both sites
    assert body["dropped"] == {"off_target": 1, "location": 1, "too_old": 1, "duplicate": 1}
    assert (
        body["samples"][0]["salary_text"] is None
        or body["samples"][0]["title"] == "Senior AI Engineer"
    )
    statuses = {s["key"]: (s["status"], s["found"]) for s in body["sources"]}
    assert statuses == {"linkedin": ("ok", 3), "jobstreet": ("ok", 2)}
    assert sources["linkedin"].queries[0].location == "Kuala Lumpur"

    # Adding a role can only add jobs: each role is screened (and cached) on its own.
    more = {**settings, "roles": ["AI Engineer", "Senior AI Engineer"]}
    bigger = done(await signed_in.post(f"{RADAR}/preview", json={"settings": more}))
    assert bigger["on_target"] >= body["on_target"]

    # Repeating a preview reuses the cache: no new requests, no new screening.
    calls = len(fake_ai.calls_for("radar.relevance"))
    queries = len(sources["linkedin"].queries)
    await signed_in.post(f"{RADAR}/preview", json={"settings": settings})
    assert len(sources["linkedin"].queries) == queries
    assert len(fake_ai.calls_for("radar.relevance")) == calls


async def test_preview_survives_a_failing_source(
    signed_in: httpx.AsyncClient, sources: dict[str, FakeSource]
) -> None:
    sources["linkedin"].fail = True
    response = await signed_in.post(
        f"{RADAR}/preview", json={"settings": {"roles": ["AI Engineer"], "freshness_days": 7}}
    )
    body = done(response)
    by_key = {s["key"]: s for s in body["sources"]}
    assert by_key["linkedin"]["status"] == "failed"
    assert by_key["jobstreet"]["status"] == "ok"
    assert body["found"] == 2  # keyword fallback screened titles (no AI handler)


async def test_preview_needs_roles(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.post(f"{RADAR}/preview", json={"settings": {"roles": []}})
    assert response.json()["error"]["code"] == "no_roles"
