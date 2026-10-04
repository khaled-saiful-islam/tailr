from __future__ import annotations

from typing import Any

import httpx
import pytest
import respx

from app.ai.fake import FakeAIClient
from app.core.config import get_settings
from app.modules.jobs.insights import JobInsights
from app.modules.kits.schemas import (
    CoverLetter,
    InterviewQuestion,
    JudgeVerdict,
    KitExtras,
    ScreeningAnswer,
    TailoredBullet,
    TailoredResume,
    TailoredRole,
    Unsupported,
)
from app.modules.matching.review import FitReview
from app.modules.profile.document import draft_to_document
from tests.factories import sample_draft

AD = "We need an AI engineer who builds RAG systems in Python and runs them on Kubernetes. " * 6


def _fact_ids(messages: list[dict[str, Any]]) -> list[str]:
    text = messages[1]["content"]
    return [
        line.split("FACT ", 1)[1].split(":", 1)[0] for line in text.splitlines() if "FACT " in line
    ]


def _role_ids(messages: list[dict[str, Any]]) -> list[str]:
    text = messages[1]["content"]
    return [
        line.split("ROLE ", 1)[1].split(":", 1)[0]
        for line in text.splitlines()
        if line.startswith("ROLE ")
    ]


@pytest.fixture
def ai(fake_ai: FakeAIClient) -> FakeAIClient:
    def tailor(messages: list[dict[str, Any]], schema: Any) -> TailoredResume:
        facts, roles = _fact_ids(messages), _role_ids(messages)
        return TailoredResume(
            headline="AI Engineer for retrieval systems",
            summary="AI engineer who ships RAG and MLOps.",
            roles=[
                TailoredRole(
                    experience_id=roles[0],
                    bullets=[
                        TailoredBullet(
                            text="Built a RAG assistant used by 40,000 staff.", fact_ids=[facts[0]]
                        ),
                        TailoredBullet(
                            text="Cut serving cost 38% and saved 2 million ringgit.",
                            fact_ids=[facts[1]],
                        ),
                    ],
                )
            ],
            skills=["Python", "Kubernetes", "Haskell"],
        )

    return (
        fake_ai.on("kits.tailor", tailor)
        .on(
            "kits.letter",
            lambda m, s: CoverLetter(
                greeting="Dear Hiring Manager,",
                paragraphs=["One.", "Two."],
                closing="Kind regards,",
            ),
        )
        .on(
            "kits.extras",
            lambda m, s: KitExtras(
                screening=[ScreeningAnswer(question="Why us?", answer="Because.")],
                recruiter_message="Hi!",
                interview=[
                    InterviewQuestion(
                        question="Tell me about RAG.",
                        why_they_ask="Core.",
                        your_story="I built one.",
                    )
                ],
            ),
        )
        .on(
            "kits.judge",
            lambda m, s: JudgeVerdict(
                unsupported=[Unsupported(index=0, reason="fine actually")][:0]
            ),
        )
        .on(
            "jobs.insights",
            lambda m, s: JobInsights(
                summary="AI role.", required_skills=["Python", "Kubernetes", "Rust"]
            ),
        )
        .on(
            "matching.review",
            lambda m, s: FitReview(
                headline="Good fit.", why=["RAG."], skill_coverage=80, experience_fit=90
            ),
        )
    )


async def _profile(client: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    assert (
        await client.put("/api/v1/profile", json={"document": document, "version": 0})
    ).status_code == 200


async def _pasted_match(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/jobs/paste", json={"title": "AI Engineer", "company": "Selat Pay", "text": AD}
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_paste_a_job_by_text(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    match = await _pasted_match(signed_in)
    assert match["origin"] == "pasted"
    assert match["status"] == "saved"
    assert match["job"]["source"] == "manual"
    assert match["review"]["headline"] == "Good fit."
    assert {r["skill"]: r["have"] for r in match["requirements"]} == {
        "Python": True,
        "Kubernetes": True,
        "Rust": False,
    }
    again = await _pasted_match(signed_in)
    assert again["id"] == match["id"]  # pasting the same job twice finds it


@pytest.mark.parametrize(
    ("payload", "code"),
    [
        ({"title": "AI Engineer", "company": "X", "text": "too short"}, "too_short"),
        ({"text": AD}, "missing_title"),
    ],
)
async def test_paste_needs_enough(
    signed_in: httpx.AsyncClient, ai: FakeAIClient, payload: dict[str, str], code: str
) -> None:
    await _profile(signed_in)
    response = await signed_in.post("/api/v1/jobs/paste", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == code


@pytest.mark.parametrize(
    ("url", "code"),
    [
        ("http://127.0.0.1/admin", "url_not_allowed"),
        ("http://169.254.169.254/latest/meta-data/", "url_not_allowed"),
        ("http://localhost:6379/", "url_not_allowed"),
        ("file:///etc/passwd", "validation_error"),
    ],
)
async def test_paste_refuses_internal_links(
    signed_in: httpx.AsyncClient, ai: FakeAIClient, url: str, code: str
) -> None:
    await _profile(signed_in)
    response = await signed_in.post("/api/v1/jobs/paste", json={"url": url})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == code


async def test_kit_end_to_end(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    match = await _pasted_match(signed_in)
    none_yet = await signed_in.get(f"/api/v1/kits/by-match/{match['id']}")
    assert none_yet.status_code == 200
    assert none_yet.json() is None
    created = await signed_in.post("/api/v1/kits", json={"match_id": match["id"], "language": "en"})
    assert created.status_code == 202, created.text

    kit = (await signed_in.get(f"/api/v1/kits/by-match/{match['id']}")).json()
    assert kit["status"] == "ready", kit
    assert kit["resume"]["headline"] == "AI Engineer for retrieval systems"
    # The invented "2 million" was caught and the original fact restored.
    bullets = [b["text"] for b in kit["resume"]["roles"][0]["bullets"]]
    assert "Cut model-serving cost by 38% with request batching." in bullets
    assert any("2" in issue["problem"] for issue in kit["fact_check"]["issues"])
    assert kit["resume"]["skills"] == ["Python", "Kubernetes"]  # Haskell isn't in the profile
    assert len(kit["resume"]["roles"]) == 2  # the dropped role came back
    assert kit["keywords"]["after"] >= kit["keywords"]["before"]
    assert kit["extras"]["recruiter_message"] == "Hi!"
    assert kit["facts"]
    assert kit["candidate_name"]
    notes = (await signed_in.get("/api/v1/notifications")).json()["items"]
    assert notes[0]["kind"] == "kit.ready"
    assert notes[0]["link"] == f"/apply/{kit['id']}"
    assert "AI Engineer" in notes[0]["title"]
    assert "role" in {s["kind"] for s in kit["sections"]}
    role_ids = {s["id"] for s in kit["sections"] if s["kind"] == "role"}
    assert {r["experience_id"] for r in kit["resume"]["roles"]} <= role_ids

    html = await signed_in.get(f"/api/v1/kits/{kit['id']}/resume.html")
    assert html.status_code == 200
    assert "Nur Aina Rahman" in html.text
    letter = await signed_in.get(f"/api/v1/kits/{kit['id']}/letter.html")
    assert "Dear Hiring Manager," in letter.text

    # Asking again returns the same kit instead of building another.
    again = await signed_in.post("/api/v1/kits", json={"match_id": match["id"]})
    assert again.json()["id"] == kit["id"]


async def test_editing_and_regenerating(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    match = await _pasted_match(signed_in)
    await signed_in.post("/api/v1/kits", json={"match_id": match["id"]})
    kit = (await signed_in.get(f"/api/v1/kits/by-match/{match['id']}")).json()

    resume = kit["resume"]
    resume["summary"] = "My own words."
    saved = await signed_in.put(
        f"/api/v1/kits/{kit['id']}", json={"version": kit["version"], "resume": resume}
    )
    assert saved.status_code == 200
    assert saved.json()["resume"]["summary"] == "My own words."
    stale = await signed_in.put(
        f"/api/v1/kits/{kit['id']}", json={"version": kit["version"], "resume": resume}
    )
    assert stale.status_code == 409

    redone = await signed_in.post(f"/api/v1/kits/{kit['id']}/regenerate", json={"language": "ms"})
    assert redone.status_code == 202
    after = (await signed_in.get(f"/api/v1/kits/{kit['id']}")).json()
    assert after["language"] == "ms"
    assert after["status"] == "ready"
    prompt = ai.calls_for("kits.tailor")[-1].messages[0]["content"]
    assert "Bahasa Malaysia" in prompt


async def test_pdf_download(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    match = await _pasted_match(signed_in)
    await signed_in.post("/api/v1/kits", json={"match_id": match["id"]})
    kit = (await signed_in.get(f"/api/v1/kits/by-match/{match['id']}")).json()
    with respx.mock(assert_all_called=True) as mock:
        mock.post(f"{get_settings().renderer_url}/pdf").respond(200, content=b"%PDF-1.7 fake")
        response = await signed_in.get(f"/api/v1/kits/{kit['id']}/resume.pdf")
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
    assert (
        'filename="Nur-Aina-Rahman-Resume-Selat-Pay.pdf"' in response.headers["content-disposition"]
    )


async def test_kits_are_private(signed_in: httpx.AsyncClient, ai: FakeAIClient) -> None:
    await _profile(signed_in)
    match = await _pasted_match(signed_in)
    await signed_in.post("/api/v1/kits", json={"match_id": match["id"]})
    kit = (await signed_in.get(f"/api/v1/kits/by-match/{match['id']}")).json()
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    assert (await signed_in.get(f"/api/v1/kits/{kit['id']}")).status_code == 404
    assert (await signed_in.get(f"/api/v1/kits/{kit['id']}/resume.html")).status_code == 404
