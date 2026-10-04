"""What visitors get: only public details, and HTML that link previews can read."""

from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime

import pytest

from app.modules.media.models import StoredImage
from app.modules.profile.document import Link, ProfileDocument, Project, draft_to_document
from app.modules.public_profile.assemble import build_page, missing_for
from app.modules.public_profile.models import PublicProfile
from app.modules.public_profile.schemas import PageSettings
from app.modules.public_profile.shell import render_page
from tests.factories import sample_draft

SHELL = (
    '<!doctype html><html><head><meta charset="UTF-8" /><title>Tailr</title>'
    '<script type="module" src="/assets/public.js"></script></head>'
    '<body><div id="root"></div></body></html>'
)
NOW = datetime(2026, 10, 4, tzinfo=UTC)


@pytest.fixture
def document() -> ProfileDocument:
    doc = draft_to_document(sample_draft())
    basics = doc.basics.model_copy(
        update={
            "email": "aina.private@example.com",
            "phone": "+60 12-345 6789",
            "location": "No 12, Jalan Ampang, 50450 Kuala Lumpur, Malaysia",
            "summary": "Builds <AI> & ships. </script><script>alert(1)</script>",
            "links": [
                Link(label="GitHub", url="https://github.com/aina"),
                Link(label="Evil", url="javascript:alert(1)"),
            ],
        }
    )
    return doc.model_copy(update={"basics": basics})


def _row(**settings: object) -> PublicProfile:
    return PublicProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        slug="nur-aina-rahman",
        visibility="public",
        template="blueprint",
        appearance="auto",
        settings=PageSettings.model_validate(settings).model_dump(mode="json"),
        version=1,
        updated_at=NOW,
    )


def test_private_details_never_reach_the_page(document: ProfileDocument) -> None:
    page = build_page(
        _row(contact_email="hello@aina.dev"),
        document,
        {},
        base_url="https://tailr.app",
        updated_at=NOW,
    )
    dumped = page.model_dump_json()
    assert "aina.private@example.com" not in dumped
    assert "hello@aina.dev" not in dumped  # revealed only on request
    assert "345 6789" not in dumped
    assert "Jalan" not in dumped
    assert page.location == "Kuala Lumpur, Malaysia"
    assert page.has_contact is True
    assert [link.url for link in page.links] == ["https://github.com/aina"]
    assert page.url == "https://tailr.app/p/nur-aina-rahman"


def test_unfinished_lines_stay_private(document: ProfileDocument) -> None:
    from app.modules.profile.document import Bullet

    role = document.experiences[0]
    unfinished = role.model_copy(
        update={"bullets": [*role.bullets, Bullet(text="Improved accuracy by [X%].")]}
    )
    with_gap = document.model_copy(update={"experiences": [unfinished, *document.experiences[1:]]})
    page = build_page(_row(), with_gap, {}, base_url="x", updated_at=NOW)
    assert all("[X%]" not in line for line in page.experiences[0].bullets)
    assert len(page.experiences[0].bullets) == len(role.bullets)


def test_location_can_be_hidden(document: ProfileDocument) -> None:
    page = build_page(_row(show_location=False), document, {}, base_url="x", updated_at=NOW)
    assert page.location is None


def test_only_the_owners_pictures_show(document: ProfileDocument) -> None:
    project = Project(name="Open-source RAG kit", bullets=[])
    with_project = document.model_copy(update={"projects": [project]})
    row = _row()
    mine = StoredImage(
        id=uuid.uuid4(),
        user_id=row.user_id,
        purpose="avatar",
        key="k",
        width=640,
        height=640,
        bytes=1,
    )
    someone_elses = uuid.uuid4()  # not in the owner's pictures
    row.settings = PageSettings(
        photo_id=mine.id, project_images={project.id: someone_elses}, featured_project_id=project.id
    ).model_dump(mode="json")
    page = build_page(row, with_project, {mine.id: mine}, base_url="x", updated_at=NOW)
    assert page.photo_url == f"/api/v1/images/{mine.id}.webp"
    assert page.projects[0].image_url is None
    assert page.projects[0].featured is True


def test_a_page_needs_a_name_and_some_work() -> None:
    empty = draft_to_document(sample_draft()).model_copy(update={"experiences": [], "projects": []})
    assert missing_for(empty) == ["a role or project"]
    assert missing_for(None) == ["your name", "a role or project"]


def _data(html: str) -> object:
    found = re.search(r'<script id="page-data" type="application/json">(.*?)</script>', html, re.S)
    assert found
    return json.loads(found.group(1))


def test_html_has_link_preview_tags_and_safe_data(document: ProfileDocument) -> None:
    page = build_page(_row(), document, {}, base_url="https://tailr.app", updated_at=NOW)
    html = render_page(SHELL, page, og_image="https://tailr.app/og.jpg?v=1", index=True)
    assert "<title>Nur Aina Rahman, " in html
    assert '<meta property="og:title" content="Nur Aina Rahman' in html
    assert '<meta property="og:image" content="https://tailr.app/og.jpg?v=1" />' in html
    assert '<meta name="twitter:card" content="summary_large_image" />' in html
    assert '<link rel="canonical" href="https://tailr.app/p/nur-aina-rahman" />' in html
    assert '<meta name="robots" content="index, follow" />' in html
    assert '"@type": "ProfilePage"' in html
    # User text can't break out of the data script or the fallback HTML.
    assert "</script><script>alert(1)" not in html
    assert "&lt;AI&gt; &amp; ships" in html
    data = _data(html)
    assert isinstance(data, dict)
    assert data["summary"].startswith("Builds <AI> & ships.")
    assert '<script type="module" src="/assets/public.js"></script>' in html


def test_link_only_pages_ask_not_to_be_indexed(document: ProfileDocument) -> None:
    page = build_page(_row(), document, {}, base_url="x", updated_at=NOW)
    html = render_page(SHELL, page, og_image="x", index=False)
    assert '<meta name="robots" content="noindex, nofollow" />' in html


def test_missing_page_html() -> None:
    html = render_page(SHELL, None, og_image="", index=False)
    assert "noindex" in html
    assert _data(html) is None
