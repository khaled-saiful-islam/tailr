"""Lines restored to the profile's wording are translated faithfully, or left as they are."""

from __future__ import annotations

from typing import Any

import pytest

from app.ai.fake import FakeAIClient
from app.core.errors import AppError
from app.modules.kits.checks import enforce_truth
from app.modules.kits.localise import Translations, localise_restored
from app.modules.kits.schemas import TailoredBullet, TailoredResume, TailoredRole
from app.modules.profile.document import ProfileDocument, draft_to_document
from tests.factories import sample_draft

MALAY = {
    "Built a RAG assistant used by 40,000 staff across 3 countries.": (
        "Membina pembantu RAG yang digunakan oleh 40,000 kakitangan di 3 negara."
    ),
    "Cut model-serving cost by 38% with request batching.": (
        "Mengurangkan kos penyajian model sebanyak 38% dengan batching permintaan."
    ),
}


@pytest.fixture
def document() -> ProfileDocument:
    return draft_to_document(sample_draft())


def _restored_kit(document: ProfileDocument) -> tuple[TailoredResume, Any]:
    """A Malay resume whose first line overclaimed, so it was put back to the English fact."""
    current = document.experiences[0]
    resume = TailoredResume(
        headline="Jurutera AI",
        summary="Jurutera.",
        roles=[
            TailoredRole(
                experience_id=current.id,
                bullets=[
                    TailoredBullet(
                        text="Membina pembantu RAG untuk 90,000 kakitangan.",
                        fact_ids=[current.bullets[0].id],
                    ),
                ],
            )
        ],
        skills=["Python"],
    )
    return enforce_truth(resume, document)


def _translate(lines_for: dict[str, str]):  # type: ignore[no-untyped-def]
    def handler(messages: list[dict[str, Any]], schema: type[Translations]) -> Translations:
        numbered = messages[-1]["content"].splitlines()
        originals = [line.split(". ", 1)[1] for line in numbered if ". " in line]
        return Translations(lines=[lines_for.get(text, f"MS: {text}") for text in originals])

    return handler


async def test_restored_lines_are_translated(
    fake_ai: FakeAIClient, document: ProfileDocument
) -> None:
    fake_ai.on("kits.translate", _translate(MALAY))
    resume, check = _restored_kit(document)
    english = document.experiences[0].bullets[0].text
    assert resume.roles[0].bullets[0].text == english

    resume, check = await localise_restored(resume, check, document, "ms", user_id=None)

    assert resume.roles[0].bullets[0].text == MALAY[english]
    assert check.issues[0].replaced_with == MALAY[english]
    # The role the AI left out came back from the profile, and is translated too.
    previous = document.experiences[1].bullets[0].text
    assert resume.roles[1].bullets[0].text == f"MS: {previous}"


async def test_translation_that_changes_a_number_is_refused(
    fake_ai: FakeAIClient, document: ProfileDocument
) -> None:
    english = document.experiences[0].bullets[0].text
    fake_ai.on("kits.translate", _translate({english: "Membina pembantu RAG untuk 50,000 orang."}))
    resume, check = _restored_kit(document)

    resume, check = await localise_restored(resume, check, document, "ms", user_id=None)

    assert resume.roles[0].bullets[0].text == english
    assert check.issues[0].replaced_with == english


async def test_english_kits_need_no_translation(
    fake_ai: FakeAIClient, document: ProfileDocument
) -> None:
    resume, check = _restored_kit(document)
    same, _ = await localise_restored(resume, check, document, "en", user_id=None)
    assert same == resume
    assert fake_ai.calls_for("kits.translate") == []


async def test_translation_failure_keeps_the_original(
    fake_ai: FakeAIClient, document: ProfileDocument
) -> None:
    def broken(messages: list[dict[str, Any]], schema: type[Translations]) -> Translations:
        raise AppError("AI is down", code="ai_unavailable")

    fake_ai.on("kits.translate", broken)
    resume, check = _restored_kit(document)
    english = document.experiences[0].bullets[0].text

    resume, _ = await localise_restored(resume, check, document, "ms", user_id=None)

    assert resume.roles[0].bullets[0].text == english
