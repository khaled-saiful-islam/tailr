from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import pytest

from app.ai.fake import FakeAIClient
from app.modules.profile.document import draft_to_document
from app.modules.profile.schemas import CoachAnswer, SummaryAnswer
from tests.factories import sample_draft

FIXTURES = Path(__file__).parents[1] / "fixtures" / "cv"
PROFILE = "/api/v1/profile"


def _document() -> dict[str, Any]:
    return draft_to_document(sample_draft()).model_dump(mode="json")


async def test_new_profile_is_prefilled_from_account(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.get(PROFILE)
    assert response.status_code == 200
    body = response.json()
    assert body["exists"] is False
    assert body["version"] == 0
    assert body["document"]["basics"]["full_name"] == "Aina Rahman"
    assert body["document"]["basics"]["email"] == "aina@example.com"
    assert body["strength"]["score"] < 30


async def test_save_creates_then_versions(signed_in: httpx.AsyncClient) -> None:
    created = await signed_in.put(PROFILE, json={"document": _document(), "version": 0})
    assert created.status_code == 200
    assert created.json()["version"] == 1
    assert created.json()["exists"] is True
    assert created.json()["strength"]["score"] == 100

    me = await signed_in.get("/api/v1/auth/me")
    assert me.json()["onboarding_step"] == "radar"

    stale = await signed_in.put(PROFILE, json={"document": _document(), "version": 0})
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "version_conflict"
    assert stale.json()["error"]["details"]["current_version"] == 1

    updated = await signed_in.put(PROFILE, json={"document": _document(), "version": 1})
    assert updated.json()["version"] == 2


async def test_save_rejects_invalid_documents(signed_in: httpx.AsyncClient) -> None:
    document = _document()
    document["skills"][1]["id"] = document["skills"][0]["id"]
    response = await signed_in.put(PROFILE, json={"document": document, "version": 0})
    assert response.status_code == 422


def _extract_handler(fake: FakeAIClient) -> None:
    fake.on("profile.extract", lambda messages, schema: sample_draft())


async def test_pdf_import_end_to_end(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    _extract_handler(fake_ai)
    upload = await signed_in.post(
        f"{PROFILE}/imports",
        files={"file": ("aina.pdf", (FIXTURES / "sample_cv.pdf").read_bytes(), "application/pdf")},
    )
    assert upload.status_code == 202, upload.text
    import_id = upload.json()["id"]

    # The in-memory broker runs the task inline, so the import is already done.
    status = await signed_in.get(f"{PROFILE}/imports/{import_id}")
    body = status.json()
    assert body["status"] == "ready", body
    assert body["used_vision"] is False
    assert body["stats"] == {
        "experiences": 2,
        "achievements": 5,
        "skills": 8,
        "education": 1,
        "projects": 0,
    }
    prompt = fake_ai.calls_for("profile.extract")[0].messages[1]["content"]
    assert "Selat Pay" in prompt  # the real PDF text reached the model

    applied = await signed_in.post(f"{PROFILE}/imports/{import_id}/apply", json={"mode": "replace"})
    assert applied.status_code == 200
    assert applied.json()["document"]["basics"]["full_name"] == "Nur Aina Rahman"
    assert applied.json()["version"] == 1

    again = await signed_in.post(f"{PROFILE}/imports/{import_id}/apply", json={"mode": "replace"})
    assert again.status_code == 409


async def test_image_import_uses_vision(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    _extract_handler(fake_ai)
    fake_ai.on(
        "profile.ocr",
        lambda messages, schema: "Nur Aina Rahman\nSenior AI Engineer at Selat Pay " * 5,
    )
    upload = await signed_in.post(
        f"{PROFILE}/imports",
        files={"file": ("scan.png", (FIXTURES / "sample_cv.png").read_bytes(), "image/png")},
    )
    body = (await signed_in.get(f"{PROFILE}/imports/{upload.json()['id']}")).json()
    assert body["status"] == "ready"
    assert body["used_vision"] is True
    image = fake_ai.calls_for("profile.ocr")[0].messages[0]["content"][1]
    assert image["image_url"]["url"].startswith("data:image/png;base64,")


async def test_text_import_and_merge(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    await signed_in.put(PROFILE, json={"document": _document(), "version": 0})
    extra = sample_draft()
    extra.skills = [extra.skills[0].model_copy(update={"name": "Rust"})]
    fake_ai.on("profile.extract", lambda messages, schema: extra)
    upload = await signed_in.post(
        f"{PROFILE}/imports/text", json={"text": "Nur Aina Rahman. " * 10}
    )
    assert upload.status_code == 202
    merged = await signed_in.post(
        f"{PROFILE}/imports/{upload.json()['id']}/apply", json={"mode": "merge"}
    )
    skills = {s["name"] for s in merged.json()["document"]["skills"]}
    assert {"Python", "Rust"} <= skills
    assert merged.json()["version"] == 2


async def test_failed_import_explains_why(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    fake_ai.on("profile.extract", lambda messages, schema: {"basics": {}})
    upload = await signed_in.post(
        f"{PROFILE}/imports/text", json={"text": "lorem ipsum dolor " * 10}
    )
    body = (await signed_in.get(f"{PROFILE}/imports/{upload.json()['id']}")).json()
    assert body["status"] == "failed"
    assert "doesn't look like a CV" in body["error"]


@pytest.mark.parametrize(
    ("name", "data", "code"),
    [("cv.exe", b"MZ\x90\x00binary", "unsupported_file"), ("empty.pdf", b"", "bad_file")],
)
async def test_bad_uploads_are_refused(
    signed_in: httpx.AsyncClient, name: str, data: bytes, code: str
) -> None:
    response = await signed_in.post(
        f"{PROFILE}/imports", files={"file": (name, data, "application/octet-stream")}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == code


async def test_imports_are_private(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    _extract_handler(fake_ai)
    upload = await signed_in.post(
        f"{PROFILE}/imports/text", json={"text": "Nur Aina Rahman. " * 10}
    )
    import_id = upload.json()["id"]
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    response = await signed_in.get(f"{PROFILE}/imports/{import_id}")
    assert response.status_code == 404


async def test_bullet_coach(signed_in: httpx.AsyncClient, fake_ai: FakeAIClient) -> None:
    fake_ai.on(
        "profile.coach",
        lambda messages, schema: CoachAnswer(
            suggestion="Built evaluation pipelines that cut regression bugs by [X%].",
            reason="Leads with the action and shows impact.",
            questions=["By how much did regressions drop?", " "],
        ),
    )
    response = await signed_in.post(
        f"{PROFILE}/coach/bullet",
        json={
            "text": "Responsible for evaluation pipelines.",
            "title": "AI Engineer",
            "company": "Selat Pay",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["suggestion"].startswith("Built")
    assert body["questions"] == ["By how much did regressions drop?"]
    prompt = fake_ai.calls_for("profile.coach")[0].messages[1]["content"]
    assert "AI Engineer at Selat Pay" in prompt


async def test_summary_needs_experience(
    signed_in: httpx.AsyncClient, fake_ai: FakeAIClient
) -> None:
    thin = await signed_in.post(f"{PROFILE}/coach/summary")
    assert thin.status_code == 422
    assert thin.json()["error"]["code"] == "profile_too_thin"

    await signed_in.put(PROFILE, json={"document": _document(), "version": 0})
    fake_ai.on(
        "profile.summary",
        lambda messages, schema: SummaryAnswer(summary="  AI engineer with six years.  "),
    )
    response = await signed_in.post(f"{PROFILE}/coach/summary")
    assert response.json() == {"summary": "AI engineer with six years."}


async def test_profile_requires_sign_in(client: httpx.AsyncClient) -> None:
    assert (await client.get(PROFILE)).status_code == 401
