"""Public pages, end to end: settings, publishing, the page, contact, views, previews."""

from __future__ import annotations

import io
import json
import re
from typing import Any

import httpx
import pytest
import respx
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.fake import FakeAIClient
from app.core.config import get_settings
from app.modules.profile.document import draft_to_document
from app.modules.public_profile.models import PublicProfileViews
from tests.background import done
from tests.factories import sample_draft

SHELL = (
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Tailr</title></head>'
    '<body><div id="root"></div></body></html>'
)
BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari"


@pytest.fixture(autouse=True)
def shell(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_shell() -> str:
        return SHELL

    monkeypatch.setattr("app.modules.public_profile.router.load_shell", fake_shell)


async def _profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    response = await client.put("/api/v1/profile", json={"document": document, "version": 0})
    assert response.status_code == 200, response.text


async def _settings(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await client.get("/api/v1/public-profile")
    assert response.status_code == 200, response.text
    return response.json()


async def _save(client: httpx.AsyncClient, **changes: Any) -> httpx.Response:
    current = await _settings(client)
    return await client.put(
        "/api/v1/public-profile", json={"version": current["version"], **changes}
    )


async def _publish(client: httpx.AsyncClient, **changes: Any) -> dict[str, Any]:
    response = await _save(client, visibility="public", **changes)
    assert response.status_code == 200, response.text
    return response.json()


def _page_data(html: str) -> Any:
    found = re.search(r'<script id="page-data" type="application/json">(.*?)</script>', html, re.S)
    assert found
    return json.loads(found.group(1))


async def test_settings_start_switched_off(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    settings = await _settings(signed_in)
    assert settings["visibility"] == "off"
    assert settings["slug"] == "nur-aina-rahman"
    assert settings["url"].endswith("/p/nur-aina-rahman")
    assert settings["missing"] == []
    assert settings["stats"] == {"last_30_days": 0, "days": [], "sources": {}}


async def test_publishing_needs_a_profile(signed_in: httpx.AsyncClient) -> None:
    response = await _save(signed_in, visibility="public")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "profile_incomplete"


async def test_page_is_served_with_previews(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    off = await signed_in.get("/p/nur-aina-rahman")
    assert off.status_code == 404
    assert _page_data(off.text) is None

    await _publish(signed_in, template="broadsheet", settings={"contact_email": "hi@aina.dev"})
    page = await signed_in.get("/p/nur-aina-rahman")
    assert page.status_code == 200
    csp = page.headers["content-security-policy"]
    assert "frame-ancestors 'none'" in csp
    assert "script-src 'self';" in csp  # no inline scripts outside development
    assert (
        '<meta property="og:image" content="http://localhost:8400/api/v1/public/profiles/nur-aina-rahman/og.jpg?v='
        in page.text
    )
    data = _page_data(page.text)
    assert data["template"] == "broadsheet"
    assert data["has_contact"] is True
    assert "hi@aina.dev" not in page.text

    api = await signed_in.get("/api/v1/public/profiles/nur-aina-rahman")
    assert api.json()["name"] == "Nur Aina Rahman"


async def test_link_only_and_switching_off(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    response = await _save(signed_in, visibility="link")
    assert response.status_code == 200
    page = await signed_in.get("/p/nur-aina-rahman")
    assert '<meta name="robots" content="noindex, nofollow" />' in page.text

    await _save(signed_in, visibility="off")
    assert (await signed_in.get("/p/nur-aina-rahman")).status_code == 404
    assert (await signed_in.get("/api/v1/public/profiles/nur-aina-rahman")).status_code == 404


async def test_contact_is_revealed_on_request(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    await _publish(signed_in)
    none = await signed_in.post("/api/v1/public/profiles/nur-aina-rahman/contact")
    assert none.status_code == 404

    await _save(signed_in, settings={"contact_email": "hi@aina.dev"})
    signed_in.cookies.clear()
    shown = await signed_in.post("/api/v1/public/profiles/nur-aina-rahman/contact")
    assert shown.json() == {"email": "hi@aina.dev"}


async def test_views_skip_the_owner_and_bots(
    signed_in: httpx.AsyncClient, db: AsyncSession
) -> None:
    await _profile(signed_in)
    await _publish(signed_in)
    await signed_in.get("/p/nur-aina-rahman", headers={"user-agent": BROWSER})  # the owner
    signed_in.cookies.clear()
    await signed_in.get("/p/nur-aina-rahman", headers={"user-agent": "WhatsApp/2.24"})
    for _ in range(3):  # one visitor, counted once
        await signed_in.get(
            "/p/nur-aina-rahman",
            headers={"user-agent": BROWSER, "referer": "https://www.linkedin.com/feed/"},
        )
    await signed_in.get("/p/nur-aina-rahman?src=qr", headers={"user-agent": BROWSER + " other"})
    rows = (await db.execute(select(PublicProfileViews))).scalars().all()
    assert len(rows) == 1
    assert rows[0].views == 2
    assert rows[0].sources == {"linkedin": 1, "qr": 1}


async def test_slugs(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    check = await signed_in.get("/api/v1/public-profile/slug-check", params={"slug": "Admin"})
    assert check.json()["available"] is False
    bad = await _save(signed_in, slug="no--good")
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "slug_invalid"
    good = await _save(signed_in, slug="aina-builds-ai")
    assert good.json()["slug"] == "aina-builds-ai"

    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    taken = await _save(signed_in, slug="aina-builds-ai")
    assert taken.status_code == 409
    assert taken.json()["error"]["code"] == "slug_taken"


async def test_settings_are_versioned(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    current = await _settings(signed_in)
    await signed_in.put(
        "/api/v1/public-profile", json={"version": current["version"], "template": "poster"}
    )
    stale = await signed_in.put(
        "/api/v1/public-profile", json={"version": current["version"], "template": "salon"}
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "version_conflict"


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (300, 300), (10, 90, 160)).save(buffer, format="PNG")
    return buffer.getvalue()


async def test_pictures_must_be_your_own(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    upload = await signed_in.post(
        "/api/v1/images",
        files={"file": ("me.png", _png(), "image/png")},
        data={"purpose": "avatar"},
    )
    photo = upload.json()["id"]
    ok = await _save(signed_in, settings={"photo_id": photo})
    assert ok.status_code == 200
    preview = (await signed_in.get("/api/v1/public-profile/preview")).json()
    assert preview["photo_url"] == f"/api/v1/images/{photo}.webp"

    missing = await _save(signed_in, settings={"photo_id": "00000000-0000-0000-0000-000000000001"})
    assert missing.status_code == 422
    assert missing.json()["error"]["code"] == "image_not_found"


async def test_highlights_are_suggested_and_checked(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    await _profile(signed_in)
    fact = (await signed_in.get("/api/v1/profile")).json()["document"]["experiences"][0]["bullets"][
        0
    ]
    assert "40,000" in fact["text"]

    def suggest(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        return {
            "highlights": [
                {"value": "40,000", "label": "staff use my RAG assistant", "fact_id": fact["id"]},
                {"value": "1M", "label": "users", "fact_id": fact["id"]},  # invented: dropped
            ]
        }

    fake_ai.on("public.highlights", suggest)
    suggested = done(await signed_in.post("/api/v1/public-profile/highlights/suggest"))
    assert [h["value"] for h in suggested] == ["40,000"]

    assert (await _save(signed_in, settings={"highlights": suggested})).status_code == 200
    invented = [{"value": "90,000", "label": "staff", "fact_id": fact["id"]}]
    rejected = await _save(signed_in, settings={"highlights": invented})
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "highlight_not_in_profile"


async def test_og_image_is_rendered_once(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    await _publish(signed_in)
    buffer = io.BytesIO()
    Image.new("RGB", (1200, 630), (11, 30, 58)).save(buffer, format="PNG")
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(f"{get_settings().renderer_url}/png").respond(
            200, content=buffer.getvalue()
        )
        first = await signed_in.get("/api/v1/public/profiles/nur-aina-rahman/og.jpg")
        second = await signed_in.get("/api/v1/public/profiles/nur-aina-rahman/og.jpg")
    assert first.status_code == 200
    assert first.headers["content-type"] == "image/jpeg"
    assert first.content[:3] == b"\xff\xd8\xff"
    assert second.content == first.content
    assert route.call_count == 1
    sent = json.loads(route.calls[0].request.content)
    assert sent["width"] == 1200
    assert sent["height"] == 630
    assert "Nur Aina Rahman" in sent["html"]


async def test_qr_code(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    response = await signed_in.get("/api/v1/public-profile/qr.svg")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/svg+xml")
    assert b"<svg" in response.content
    cv = await signed_in.get("/api/v1/public-profile/qr.svg", params={"page": "cv"})
    assert "nur-aina-rahman-cv-qr.svg" in cv.headers["content-disposition"]


async def test_owner_endpoints_need_sign_in(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/public-profile")).status_code == 401
