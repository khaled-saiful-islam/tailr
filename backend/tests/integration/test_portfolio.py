"""Portfolio end to end: content, sub-pages, the contact form and inbox, AI drafts."""

from __future__ import annotations

import io
import json
import re
from datetime import timedelta
from typing import Any

import httpx
import pytest
from PIL import Image

from app.ai.fake import FakeAIClient
from app.core.clock import utcnow
from app.modules.profile.document import draft_to_document
from app.modules.public_profile import contact
from app.modules.public_profile.contact import form_token
from tests.background import done
from tests.factories import sample_draft

SHELL = (
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Tailr</title></head>'
    '<body><div id="root"></div></body></html>'
)


@pytest.fixture(autouse=True)
def shell(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_shell() -> str:
        return SHELL

    monkeypatch.setattr("app.modules.public_profile.router.load_shell", fake_shell)


@pytest.fixture
def emails(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    sent: list[dict[str, Any]] = []

    async def capture(**kwargs: Any) -> bool:
        sent.append(kwargs)
        return True

    monkeypatch.setattr(contact, "send_email", capture)
    return sent


async def _profile_with_project(client: httpx.AsyncClient) -> dict[str, Any]:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    document["projects"] = [
        {
            "id": "proj1",
            "name": "Open-source RAG kit",
            "summary": "A starter kit for retrieval apps.",
            "bullets": [{"id": "pb1", "text": "Starred 1,200 times on GitHub."}],
        }
    ]
    response = await client.put("/api/v1/profile", json={"document": document, "version": 0})
    assert response.status_code == 200, response.text
    return document


async def _settings(client: httpx.AsyncClient) -> dict[str, Any]:
    return (await client.get("/api/v1/public-profile")).json()


async def _save(client: httpx.AsyncClient, **changes: Any) -> httpx.Response:
    current = await _settings(client)
    return await client.put(
        "/api/v1/public-profile", json={"version": current["version"], **changes}
    )


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (400, 250), (20, 120, 90)).save(buffer, format="PNG")
    return buffer.getvalue()


def _data(html: str) -> Any:
    found = re.search(r'<script id="page-data" type="application/json">(.*?)</script>', html, re.S)
    assert found
    return json.loads(found.group(1))


PORTFOLIO = {
    "hero_line": "I build AI that bank staff actually use.",
    "about": ["I build retrieval systems at Selat Pay.", "Before that, recommendations."],
    "currently": "Building search for 40,000 staff",
    "interests": ["Badminton", "Street food"],
    "expertise": [{"title": "Retrieval", "description": "I build RAG.", "tools": ["Python"]}],
    "testimonials": [
        {"quote": "Aina makes hard things simple.", "name": "Wei Ling", "role": "CTO"}
    ],
    "layout": "multi_page",
}


async def test_portfolio_content_and_pages(signed_in: httpx.AsyncClient) -> None:
    await _profile_with_project(signed_in)
    upload = await signed_in.post(
        "/api/v1/images",
        files={"file": ("shot.png", _png(), "image/png")},
        data={"purpose": "project"},
    )
    image_id = upload.json()["id"]
    settings = (await _settings(signed_in))["settings"]
    settings["portfolio"] = {
        **PORTFOLIO,
        "case_studies": {
            "proj1": {"overview": "A kit.", "approach": ["Kept it small."], "gallery": [image_id]},
            "gone": {"overview": "A deleted project."},
        },
    }
    saved = await _save(signed_in, settings=settings, visibility="public")
    assert saved.status_code == 200, saved.text
    assert list(saved.json()["settings"]["portfolio"]["case_studies"]) == ["proj1"]

    home = await signed_in.get("/p/nur-aina-rahman")
    data = _data(home.text)
    assert data["kind"] == "portfolio"
    assert data["hero_line"] == PORTFOLIO["hero_line"]
    assert data["layout"] == "multi_page"
    assert data["projects"][0]["path"] == "open-source-rag-kit"
    assert data["projects"][0]["case"]["gallery"][0]["width"] == 400
    assert data["form_token"]
    assert data["cv_url"] is None

    about = await signed_in.get("/p/nur-aina-rahman/about")
    assert "<title>About Nur Aina Rahman | Tailr</title>" in about.text
    work = await signed_in.get("/p/nur-aina-rahman/work/open-source-rag-kit")
    assert work.status_code == 200
    assert "Open-source RAG kit by Nur Aina Rahman" in work.text
    assert (await signed_in.get("/p/nur-aina-rahman/work/nope")).status_code == 404
    assert (await signed_in.get("/p/nur-aina-rahman/admin")).status_code == 404


async def test_gallery_pictures_must_be_yours(signed_in: httpx.AsyncClient) -> None:
    await _profile_with_project(signed_in)
    settings = (await _settings(signed_in))["settings"]
    settings["portfolio"] = {
        "case_studies": {"proj1": {"gallery": ["00000000-0000-0000-0000-000000000009"]}}
    }
    response = await _save(signed_in, settings=settings)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "image_not_found"


async def test_shared_cv_appears_on_the_portfolio(signed_in: httpx.AsyncClient) -> None:
    await _profile_with_project(signed_in)
    await _save(signed_in, visibility="public")
    cv = (await signed_in.get("/api/v1/cv")).json()
    await signed_in.put("/api/v1/cv", json={"version": cv["version"], "visibility": "link"})
    data = _data((await signed_in.get("/p/nur-aina-rahman")).text)
    assert data["cv_url"] == "/api/v1/public/cv/nur-aina-rahman/cv.pdf"


def _message(token: str, **changes: Any) -> dict[str, Any]:
    return {
        "name": "Hafiz",
        "email": "hafiz@company.my",
        "reason": "job",
        "company": "Maju Tech",
        "message": "Hi Aina, we're hiring an AI lead in KL. Can we talk this week?",
        "token": token,
        **changes,
    }


def _aged_token() -> str:
    return form_token("nur-aina-rahman", utcnow() - timedelta(seconds=30))


async def test_contact_form_reaches_the_inbox(
    signed_in: httpx.AsyncClient, emails: list[dict[str, Any]]
) -> None:
    await _profile_with_project(signed_in)
    await _save(signed_in, visibility="public")

    sent = await signed_in.post(
        "/api/v1/public/profiles/nur-aina-rahman/messages", json=_message(_aged_token())
    )
    assert sent.status_code == 202, sent.text
    assert len(emails) == 1
    assert emails[0]["reply_to"] == "hafiz@company.my"
    assert "Hafiz sent you a message" in emails[0]["subject"]
    assert emails[0]["to"] == "aina@example.com"

    # Bots: the hidden field, or a form sent too fast, look sent but go nowhere.
    bot = await signed_in.post(
        "/api/v1/public/profiles/nur-aina-rahman/messages",
        json=_message(_aged_token(), website="http://spam.example"),
    )
    assert bot.status_code == 202
    fast = await signed_in.post(
        "/api/v1/public/profiles/nur-aina-rahman/messages",
        json=_message(form_token("nur-aina-rahman")),
    )
    assert fast.status_code == 202

    inbox = (await signed_in.get("/api/v1/public-profile/messages")).json()
    assert inbox["unread"] == 1
    message = inbox["items"][0]
    assert message["company"] == "Maju Tech"
    assert message["flagged"] is False
    note = (await signed_in.get("/api/v1/notifications")).json()["items"][0]
    assert note["kind"] == "message.new"

    read = await signed_in.post(f"/api/v1/public-profile/messages/{message['id']}/read")
    assert read.status_code == 204
    assert (await signed_in.get("/api/v1/public-profile/messages")).json()["unread"] == 0

    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    stranger = await signed_in.delete(f"/api/v1/public-profile/messages/{message['id']}")
    assert stranger.status_code == 404


async def test_link_heavy_messages_are_flagged(
    signed_in: httpx.AsyncClient, emails: list[dict[str, Any]]
) -> None:
    await _profile_with_project(signed_in)
    await _save(signed_in, visibility="public")
    spammy = "Buy now http://a.example http://b.example http://c.example cheap cheap cheap"
    await signed_in.post(
        "/api/v1/public/profiles/nur-aina-rahman/messages",
        json=_message(_aged_token(), message=spammy),
    )
    inbox = (await signed_in.get("/api/v1/public-profile/messages")).json()
    assert inbox["items"][0]["flagged"] is True
    assert emails == []  # flagged messages wait in the inbox; no email


async def test_contact_form_can_be_off(signed_in: httpx.AsyncClient) -> None:
    await _profile_with_project(signed_in)
    settings = (await _settings(signed_in))["settings"]
    settings["portfolio"] = {"contact_form": False}
    await _save(signed_in, settings=settings, visibility="public")
    response = await signed_in.post(
        "/api/v1/public/profiles/nur-aina-rahman/messages", json=_message(_aged_token())
    )
    assert response.status_code == 404


async def test_ai_drafts(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    await _profile_with_project(signed_in)

    def draft(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        assert "Write only: hero_line and about, case_studies." in messages[1]["content"]
        return {
            "hero_line": "I build AI that bank staff actually use.",
            "about": ["I build retrieval systems.", "I once led 90 people."],
            "case_studies": [{"project_id": "proj1", "outcome": "Starred 1,200 times."}],
            "needs_input": [],
        }

    fake_ai.on("portfolio.draft", draft)
    response = await signed_in.post(
        "/api/v1/public-profile/draft", json={"parts": ["story", "case_studies"]}
    )
    body = done(response)
    assert body["hero_line"] == "I build AI that bank staff actually use."
    assert body["about"] == ["I build retrieval systems."]  # 90 isn't in the profile
    assert body["case_studies"]["proj1"]["outcome"] == "Starred 1,200 times."
    assert body["expertise"] == []  # not asked for
