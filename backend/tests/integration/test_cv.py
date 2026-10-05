"""CV Studio end to end: words, design, AI edits, undo, PDFs and the share page."""

from __future__ import annotations

import io
import json
import re
from typing import Any

import httpx
import pytest
import respx
from PIL import Image

from app.ai.fake import FakeAIClient
from app.core.config import get_settings
from app.modules.kits.schemas import TailoredResume
from app.modules.profile.document import draft_to_document
from tests.factories import sample_draft

SHELL = (
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Tailr</title></head>'
    '<body><div id="root"></div></body></html>'
)


@pytest.fixture(autouse=True)
def shell(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_shell(request: object = None) -> str:
        return SHELL

    monkeypatch.setattr("app.modules.cv.router.load_shell", fake_shell)


async def _profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    response = await client.put("/api/v1/profile", json={"document": document, "version": 0})
    assert response.status_code == 200, response.text


async def _cv(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await client.get("/api/v1/cv")
    assert response.status_code == 200, response.text
    return response.json()


async def _save(client: httpx.AsyncClient, **changes: Any) -> httpx.Response:
    current = await _cv(client)
    return await client.put("/api/v1/cv", json={"version": current["version"], **changes})


async def test_a_cv_needs_a_profile(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.get("/api/v1/cv")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "no_profile"


async def test_cv_starts_from_the_profile(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    cv = await _cv(signed_in)
    assert cv["template"] == "meridian"
    assert cv["visibility"] == "off"
    assert cv["status"] == "ready"
    assert cv["stale"] is False
    assert cv["can_undo"] is False
    assert cv["url"].endswith("/cv/nur-aina-rahman")
    assert cv["content"]["roles"]
    assert cv["facts"]


async def test_design_and_words_save_with_versions(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    cv = await _cv(signed_in)
    content = cv["content"]
    content["summary"] = "My own summary."
    saved = await _save(signed_in, template="ledger", accent="cobalt", content=content)
    assert saved.status_code == 200
    assert saved.json()["template"] == "ledger"
    assert saved.json()["content"]["summary"] == "My own summary."
    stale = await signed_in.put("/api/v1/cv", json={"version": cv["version"], "accent": "jade"})
    assert stale.status_code == 409
    preview = await signed_in.get("/api/v1/cv/document.html")
    assert "My own summary." in preview.text
    assert preview.headers["x-frame-options"] == "SAMEORIGIN"
    other = await signed_in.get("/api/v1/cv/document.html", params={"template": "atelier"})
    assert "Syne" in other.text


async def test_ai_edit_then_undo(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    await _profile(signed_in)
    before = await _cv(signed_in)

    def polish(messages: list[dict[str, Any]], schema: type) -> TailoredResume:
        current = TailoredResume.model_validate_json(
            messages[-1]["content"].split("CURRENT CV\n", 1)[1]
        )
        return current.model_copy(update={"summary": "Builds retrieval systems people use."})

    fake_ai.on("cv.improve", polish)
    fake_ai.on("kits.judge", lambda m, s: {"unsupported": []})
    started = await signed_in.post("/api/v1/cv/ai", json={"action": "polish"})
    assert started.status_code == 202, started.text

    after = await _cv(signed_in)  # the in-memory worker has already run
    assert after["status"] == "ready"
    assert after["content"]["summary"] == "Builds retrieval systems people use."
    assert after["last_action"] == "Every line polished"
    assert after["can_undo"] is True
    note = (await signed_in.get("/api/v1/notifications")).json()["items"][0]
    assert note["kind"] == "cv.ready"

    undone = await signed_in.post("/api/v1/cv/undo", params={"version": after["version"]})
    assert undone.json()["content"]["summary"] == before["content"]["summary"]
    assert undone.json()["can_undo"] is False


async def test_custom_edits_need_words(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    response = await signed_in.post("/api/v1/cv/ai", json={"action": "custom", "instruction": " "})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "instruction_missing"


async def test_reset_and_stale(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    cv = await _cv(signed_in)
    profile = (await signed_in.get("/api/v1/profile")).json()
    document = profile["document"]
    document["basics"]["headline"] = "Principal AI Engineer"
    await signed_in.put(
        "/api/v1/profile", json={"document": document, "version": profile["version"]}
    )
    assert (await _cv(signed_in))["stale"] is True
    reset = await signed_in.post("/api/v1/cv/reset", params={"version": cv["version"]})
    assert reset.json()["content"]["headline"] == "Principal AI Engineer"
    assert reset.json()["stale"] is False


async def test_own_pdf(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    await _save(signed_in, options={"paper": "Letter"})
    with respx.mock(assert_all_called=True) as mock:
        route = mock.post(f"{get_settings().renderer_url}/pdf").respond(200, content=b"%PDF-1.7")
        response = await signed_in.get("/api/v1/cv/cv.pdf")
    assert response.status_code == 200
    assert 'filename="Nur-Aina-Rahman-CV.pdf"' in response.headers["content-disposition"]
    assert json.loads(route.calls[0].request.content)["format"] == "Letter"


def _page_data(html: str) -> Any:
    found = re.search(r'<script id="page-data" type="application/json">(.*?)</script>', html, re.S)
    assert found
    return json.loads(found.group(1))


async def test_share_page(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    off = await signed_in.get("/cv/nur-aina-rahman")
    assert off.status_code == 404

    await _save(signed_in, visibility="link")
    signed_in.cookies.clear()
    page = await signed_in.get("/cv/nur-aina-rahman")
    assert page.status_code == 200
    assert '<meta name="robots" content="noindex, nofollow" />' in page.text
    assert "/api/v1/public/cv/nur-aina-rahman/og.jpg?v=" in page.text
    data = _page_data(page.text)
    assert data["kind"] == "cv"
    assert data["document_url"] == "/api/v1/public/cv/nur-aina-rahman/document.html"

    document = await signed_in.get(data["document_url"])
    assert document.status_code == 200
    phone = draft_to_document(sample_draft()).basics.phone
    if phone:
        assert phone not in document.text


async def test_shared_pdf_and_preview_image(signed_in: httpx.AsyncClient) -> None:
    await _profile(signed_in)
    await _save(signed_in, visibility="public")
    buffer = io.BytesIO()
    Image.new("RGB", (1200, 630), (240, 240, 244)).save(buffer, format="PNG")
    with respx.mock(assert_all_called=True) as mock:
        mock.post(f"{get_settings().renderer_url}/pdf").respond(200, content=b"%PDF-1.7")
        png = mock.post(f"{get_settings().renderer_url}/png").respond(
            200, content=buffer.getvalue()
        )
        pdf = await signed_in.get("/api/v1/public/cv/nur-aina-rahman/cv.pdf")
        first = await signed_in.get("/api/v1/public/cv/nur-aina-rahman/og.jpg")
        second = await signed_in.get("/api/v1/public/cv/nur-aina-rahman/og.jpg")
    assert pdf.status_code == 200
    assert first.headers["content-type"] == "image/jpeg"
    assert second.content == first.content
    assert png.call_count == 1


async def test_cv_routes_need_sign_in(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/cv")).status_code == 401
    assert (await client.get("/api/v1/public/cv/nobody/document.html")).status_code == 404
