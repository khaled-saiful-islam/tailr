"""CV words, designs and AI edits."""

from __future__ import annotations

from typing import Any

import pytest

from app.ai.fake import FakeAIClient
from app.modules.cv.ai import improve
from app.modules.cv.content import content_from_profile
from app.modules.cv.render import cv_context, cv_html
from app.modules.cv.schemas import TEMPLATES, CvOptions
from app.modules.kits.schemas import TailoredBullet, TailoredResume, TailoredRole
from app.modules.profile.document import Bullet, ProfileDocument, draft_to_document
from tests.factories import sample_draft


@pytest.fixture
def document() -> ProfileDocument:
    doc = draft_to_document(sample_draft())
    basics = doc.basics.model_copy(update={"email": "aina@example.com", "phone": "+60 12-345 6789"})
    return doc.model_copy(update={"basics": basics})


def test_words_start_from_the_profile(document: ProfileDocument) -> None:
    role = document.experiences[0]
    unfinished = role.model_copy(
        update={"bullets": [*role.bullets, Bullet(text="Grew revenue by [X%].")]}
    )
    doc = document.model_copy(update={"experiences": [unfinished, *document.experiences[1:]]})
    content = content_from_profile(doc)
    assert content.headline == doc.basics.headline
    assert [r.experience_id for r in content.roles] == [r.id for r in doc.experiences]
    lines = [b.text for b in content.roles[0].bullets]
    assert "Grew revenue by [X%]." not in lines
    assert all(b.fact_ids for b in content.roles[0].bullets)


@pytest.mark.parametrize("template", TEMPLATES)
def test_every_design_renders(template: str, document: ProfileDocument) -> None:
    html = cv_html(
        document, content_from_profile(document), CvOptions(), template=template, accent="jade"
    )
    assert document.basics.full_name in html
    assert "@page" in html
    assert "font-face" in html  # fonts travel with the document
    assert "<script" not in html


def test_shared_cv_never_shows_the_phone(document: ProfileDocument) -> None:
    content = content_from_profile(document)
    mine = cv_context(document, content, CvOptions(), template="ledger", accent="ink")
    shared = cv_context(
        document, content, CvOptions(), template="ledger", accent="ink", public=True
    )
    assert any(c.kind == "phone" for c in mine["contact"])
    assert all(c.kind != "phone" for c in shared["contact"])
    hidden = cv_context(
        document,
        content,
        CvOptions(show_email=False, show_phone=False),
        template="ledger",
        accent="ink",
    )
    assert {c.kind for c in hidden["contact"]} <= {"location", "link"}


def test_options_change_the_document(document: ProfileDocument) -> None:
    content = content_from_profile(document)
    options = CvOptions(
        language="ms", hidden_sections=["projects"], density="compact", paper="Letter"
    )
    context = cv_context(document, content, options, template="meridian", accent="plum")
    assert context["labels"]["experience"] == "Pengalaman"
    assert context["show"]["projects"] is False
    assert context["fs"] < 10
    assert context["page_width"] == "8.5in"
    html = cv_html(document, content, options, template="meridian", accent="plum")
    assert "size: Letter" in html


def test_user_text_is_escaped(document: ProfileDocument) -> None:
    content = content_from_profile(document).model_copy(
        update={"summary": "<script>alert(1)</script> & more"}
    )
    html = cv_html(document, content, CvOptions(), template="atelier", accent="ink")
    assert "<script>alert(1)" not in html
    assert "&lt;script&gt;" in html


async def test_ai_edits_are_truth_checked(fake_ai: FakeAIClient, document: ProfileDocument) -> None:
    role = document.experiences[0]
    fact = role.bullets[0]  # "... used by 40,000 staff across 3 countries."

    def edit(messages: list[dict[str, Any]], schema: type) -> TailoredResume:
        assert "Polish the whole CV" in messages[0]["content"]
        return TailoredResume(
            headline="AI engineer, 12 years",  # 12 isn't in the profile
            summary="Builds retrieval systems.",
            roles=[
                TailoredRole(
                    experience_id=role.id,
                    bullets=[
                        TailoredBullet(
                            text="Shipped a RAG assistant for 90,000 staff.", fact_ids=[fact.id]
                        )
                    ],
                )
            ],
            skills=["Python", "Rust"],
        )

    fake_ai.on("cv.improve", edit)
    fake_ai.on("kits.judge", lambda m, s: {"unsupported": []})
    content = content_from_profile(document)
    edited, check = await improve(
        document, content, action="polish", instruction=None, language="en", user_id=None
    )
    assert edited.roles[0].bullets[0].text == fact.text  # invented number put back
    assert edited.headline == content.headline  # headline with an unknown number refused
    assert edited.summary == "Builds retrieval systems."
    assert "Rust" not in edited.skills
    assert check.skills_removed == ["Rust"]
    assert len(edited.roles) == len(document.experiences)  # no role dropped


async def test_new_summary_may_use_numbers_from_the_profile_summary(
    fake_ai: FakeAIClient, document: ProfileDocument
) -> None:
    basics = document.basics.model_copy(
        update={"summary": "AI engineer with 6 years of experience."}
    )
    doc = document.model_copy(update={"basics": basics})

    def edit(messages: list[dict[str, Any]], schema: type) -> TailoredResume:
        current = content_from_profile(doc)
        return current.model_copy(
            update={
                "summary": "Six-year AI engineer: 6 years shipping search, 38% cheaper serving."
            }
        )

    fake_ai.on("cv.improve", edit)
    fake_ai.on("kits.judge", lambda m, s: {"unsupported": []})
    edited, _ = await improve(
        doc,
        content_from_profile(doc),
        action="summary",
        instruction=None,
        language="en",
        user_id=None,
    )
    assert edited.summary.startswith("Six-year AI engineer")
