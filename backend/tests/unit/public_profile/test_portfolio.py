"""Portfolio rules: contact-form tokens, AI draft checks, project addresses, assembly."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.modules.media.models import StoredImage
from app.modules.profile.document import Bullet, ProfileDocument, Project, draft_to_document
from app.modules.public_profile.assemble import build_page, project_paths, whatsapp_link
from app.modules.public_profile.contact import form_token, token_ok
from app.modules.public_profile.drafting import _CaseOut, _DraftOut, _only, check_draft
from app.modules.public_profile.models import PublicProfile
from app.modules.public_profile.schemas import (
    CaseStudy,
    Expertise,
    PageSettings,
    PortfolioContent,
)
from app.modules.public_profile.shell import render_page
from tests.factories import sample_draft

NOW = datetime(2026, 10, 4, 12, 0, tzinfo=UTC)


@pytest.fixture
def document() -> ProfileDocument:
    doc = draft_to_document(sample_draft())
    project = Project(
        name="Open-source RAG kit",
        summary="A starter kit for retrieval apps.",
        bullets=[Bullet(text="Starred 1,200 times on GitHub.")],
    )
    return doc.model_copy(update={"projects": [project]})


def test_form_tokens() -> None:
    token = form_token("aina", NOW)
    assert token_ok("aina", token, NOW + timedelta(seconds=10))
    assert not token_ok("aina", token, NOW + timedelta(seconds=1))  # too fast: a bot
    assert not token_ok("aina", token, NOW + timedelta(days=2))  # too old
    assert not token_ok("someone-else", token, NOW + timedelta(seconds=10))
    stamp, signature = token.split(".")
    assert not token_ok("aina", f"{int(stamp) - 100}.{signature}", NOW + timedelta(seconds=10))
    assert not token_ok("aina", "nonsense", NOW)


def test_drafts_keep_only_what_the_profile_supports(document: ProfileDocument) -> None:
    project = document.projects[0]
    raw = _DraftOut(
        hero_line="I build AI for 2 million people.",  # invented number
        about=[
            "I'm an AI engineer at Selat Pay.",
            "I grew a team to 40 engineers.",  # 40 isn't in the profile
        ],
        expertise=[
            Expertise(
                title="Retrieval systems", description="I build RAG.", tools=["python", "Haskell"]
            )
        ],
        case_studies=[
            _CaseOut(
                project_id=project.id,
                overview="A starter kit for retrieval apps.",
                outcome="Starred 1,200 times.",
                problem="Teams waited 3 weeks for search.",  # 3 isn't in this project's facts
            ),
            _CaseOut(project_id="not-a-project", overview="Made up."),
        ],
        needs_input=["the outcome of the RAG kit"],
    )
    draft = check_draft(raw, document)
    assert draft.hero_line is None
    assert draft.about == ["I'm an AI engineer at Selat Pay."]
    assert draft.expertise[0].tools == ["Python"]
    case = draft.case_studies[project.id]
    assert case.outcome == "Starred 1,200 times."
    assert case.problem is None
    assert list(draft.case_studies) == [project.id]
    assert draft.needs_input == ["the outcome of the RAG kit"]


def test_drafts_return_only_the_parts_asked_for(document: ProfileDocument) -> None:
    project = document.projects[0]
    raw = _DraftOut(
        hero_line="I build retrieval systems people use.",
        about=["I'm an AI engineer at Selat Pay."],
        expertise=[Expertise(title="Retrieval", description="I build RAG.", tools=["Python"])],
        case_studies=[_CaseOut(project_id=project.id, overview="A starter kit.")],
        needs_input=[
            "what you're looking for next",
            f"the key decisions behind {project.name}",
            f"the problem behind {project.id}",
        ],
    )
    story = _only(check_draft(raw, document), ["story"], document)
    assert story.hero_line == "I build retrieval systems people use."
    assert story.expertise == []
    assert story.case_studies == {}
    assert story.needs_input == ["what you're looking for next"]

    cases = _only(check_draft(raw, document), ["case_studies"], document)
    assert cases.hero_line is None
    assert list(cases.case_studies) == [project.id]
    assert len(cases.needs_input) == 3


def test_project_addresses_are_readable_and_unique() -> None:
    paths = project_paths(
        [("a1b2c3d4", "RAG Kit"), ("e5f6a7b8", "RAG kit"), ("c9", "Ünïcode Tool")]
    )
    assert paths["a1b2c3d4"] == "rag-kit"
    assert paths["e5f6a7b8"] == "rag-kit-e5f6a7"
    assert paths["c9"] == "unicode-tool"


def test_whatsapp_link() -> None:
    assert whatsapp_link("+60 12-345 6789") == "https://wa.me/60123456789"
    assert whatsapp_link("123") is None
    assert whatsapp_link(None) is None


def _row(portfolio: PortfolioContent, **settings: object) -> PublicProfile:
    return PublicProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        slug="nur-aina-rahman",
        visibility="public",
        template="salon",
        appearance="auto",
        settings=PageSettings(portfolio=portfolio, **settings).model_dump(mode="json"),  # type: ignore[arg-type]
        version=1,
        updated_at=NOW,
    )


def test_case_study_pages(document: ProfileDocument) -> None:
    project = document.projects[0]
    mine = StoredImage(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        purpose="project",
        key="k",
        width=800,
        height=500,
        bytes=1,
    )
    stranger = uuid.uuid4()
    portfolio = PortfolioContent(
        hero_line="I build AI that people use.",
        about=["First.", "Second."],
        case_studies={
            project.id: CaseStudy(
                overview="A kit.", approach=["Kept it small."], gallery=[mine.id, stranger]
            )
        },
        layout="multi_page",
        contact_form=False,
        whatsapp="+60 12 345 6789",
    )
    page = build_page(
        _row(portfolio),
        document,
        {mine.id: mine},
        base_url="https://tailr.app",
        updated_at=NOW,
        form_token="t",
    )
    assert page.hero_line == "I build AI that people use."
    assert page.layout == "multi_page"
    assert page.projects[0].path == "open-source-rag-kit"
    assert page.projects[0].case is not None
    assert [g.url for g in page.projects[0].case.gallery] == [f"/api/v1/images/{mine.id}.webp"]
    assert page.form_token is None  # the form is off
    assert page.whatsapp_url == "https://wa.me/60123456789"
    assert page.cv_url is None  # no shared CV

    shell = '<html><head><title>x</title></head><body><div id="root"></div></body></html>'
    project_html = render_page(
        shell, page, og_image="o", index=True, path="work/open-source-rag-kit"
    )
    assert "<title>Open-source RAG kit by Nur Aina Rahman | Tailr</title>" in project_html
    canonical = "https://tailr.app/p/nur-aina-rahman/work/open-source-rag-kit"
    assert f'<link rel="canonical" href="{canonical}" />' in project_html
    about_html = render_page(shell, page, og_image="o", index=True, path="about")
    assert "<title>About Nur Aina Rahman | Tailr</title>" in about_html


async def test_judge_drops_invented_decisions(document: ProfileDocument, fake_ai: object) -> None:
    from typing import Any

    from app.ai.fake import FakeAIClient
    from app.modules.public_profile.drafting import draft_portfolio

    assert isinstance(fake_ai, FakeAIClient)
    project = document.projects[0]

    def write(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        return {
            "about": ["I build AI at Selat Pay.", "I won a national award."],
            "case_studies": [
                {
                    "project_id": project.id,
                    "overview": "A starter kit for retrieval apps.",
                    "approach": ["Kept the kit small.", "Chose Rust for speed."],
                    "outcome": "Starred 1,200 times.",
                }
            ],
        }

    def judge(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        statements = messages[-1]["content"].split("STATEMENTS\n", 1)[1].splitlines()
        bad = [
            int(line.split(" ", 1)[0].rstrip("."))
            for line in statements
            if "award" in line or "Rust" in line
        ]
        return {"unsupported": [{"index": i, "reason": "not in the facts"} for i in bad]}

    fake_ai.on("portfolio.draft", write)
    fake_ai.on("portfolio.judge", judge)
    draft = await draft_portfolio(document, ["story", "case_studies"], uuid.uuid4())
    assert draft.about == ["I build AI at Selat Pay."]
    case = draft.case_studies[project.id]
    assert case.approach == ["Kept the kit small."]
    assert case.outcome == "Starred 1,200 times."


async def test_without_the_judge_only_safe_parts_stay(
    document: ProfileDocument, fake_ai: object
) -> None:
    from typing import Any

    from app.ai.fake import FakeAIClient
    from app.core.errors import AppError
    from app.modules.public_profile.drafting import draft_portfolio

    assert isinstance(fake_ai, FakeAIClient)
    project = document.projects[0]

    def write(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        return {
            "case_studies": [
                {
                    "project_id": project.id,
                    "overview": "A kit.",
                    "approach": ["Chose Rust."],
                    "problem": "Slow.",
                }
            ]
        }

    def broken(messages: list[dict[str, Any]], schema: type) -> dict[str, Any]:
        raise AppError("down", code="ai_unavailable")

    fake_ai.on("portfolio.draft", write)
    fake_ai.on("portfolio.judge", broken)
    draft = await draft_portfolio(document, ["case_studies"], uuid.uuid4())
    case = draft.case_studies[project.id]
    assert case.approach == []
    assert case.problem is None
    assert case.overview == "A kit."
