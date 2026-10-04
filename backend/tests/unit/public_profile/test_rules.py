"""Slugs, privacy filters, highlights and visit counting rules."""

from __future__ import annotations

import pytest

from app.modules.kits.checks import fact_sources
from app.modules.profile.document import ProfileDocument, draft_to_document
from app.modules.public_profile.highlights import is_truthful
from app.modules.public_profile.privacy import safe_location, safe_url
from app.modules.public_profile.schemas import Highlight
from app.modules.public_profile.slugs import slug_problem, slugify
from app.modules.public_profile.views import is_bot, source_of
from tests.factories import sample_draft


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Nur Aina Rahman", "nur-aina-rahman"),
        ("  José  Ñúñez ", "jose-nunez"),
        ("李明", "me-profile"),
        ("Admin", "admin-profile"),
        ("A" * 60, "a" * 40),
    ],
)
def test_slugify(name: str, slug: str) -> None:
    assert slugify(name) == slug
    assert slug_problem(slugify(name)) is None


@pytest.mark.parametrize(
    "slug", ["ab", "-aina", "aina-", "aina--rahman", "Aina", "ai na", "api", "a" * 41, "aina_r"]
)
def test_bad_slugs(slug: str) -> None:
    assert slug_problem(slug) is not None


@pytest.mark.parametrize(
    ("raw", "shown"),
    [
        ("Kuala Lumpur, Malaysia", "Kuala Lumpur, Malaysia"),
        ("No 12, Jalan Ampang, 50450 Kuala Lumpur, Malaysia", "Kuala Lumpur, Malaysia"),
        ("Unit 3-1, Menara X, Petaling Jaya, Selangor", "Petaling Jaya, Selangor"),
        ("Penang", "Penang"),
        ("", None),
        (None, None),
    ],
)
def test_location_is_city_level(raw: str | None, shown: str | None) -> None:
    assert safe_location(raw) == shown


@pytest.mark.parametrize(
    ("raw", "shown"),
    [
        ("https://github.com/aina", "https://github.com/aina"),
        ("linkedin.com/in/aina", "https://linkedin.com/in/aina"),
        ("javascript:alert(1)", None),
        ("data:text/html,<script>", None),
        ("mailto:a@b.c", None),
        ("", None),
    ],
)
def test_only_web_links(raw: str, shown: str | None) -> None:
    assert safe_url(raw) == shown


@pytest.fixture
def document() -> ProfileDocument:
    return draft_to_document(sample_draft())


def test_highlights_must_use_the_facts_numbers(document: ProfileDocument) -> None:
    sources = fact_sources(document)
    fact = document.experiences[0].bullets[0]  # "... used by 40,000 staff across 3 countries."
    good = Highlight(value="40,000", label="staff use the RAG assistant I built", fact_id=fact.id)
    assert is_truthful(good, sources)
    inflated = Highlight(value="400,000", label="staff use it", fact_id=fact.id)
    assert not is_truthful(inflated, sources)
    sneaky = Highlight(value="40,000", label="staff in 12 countries", fact_id=fact.id)
    assert not is_truthful(sneaky, sources)
    uncited = Highlight(value="40,000", label="staff", fact_id=None)
    assert not is_truthful(uncited, sources)
    no_number = Highlight(value="Many", label="happy staff", fact_id=fact.id)
    assert not is_truthful(no_number, sources)


@pytest.mark.parametrize(
    ("agent", "bot"),
    [
        ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit Safari", False),
        ("WhatsApp/2.24.1 A", True),
        ("LinkedInBot/1.0", True),
        ("facebookexternalhit/1.1", True),
        ("Mozilla/5.0 (compatible; Googlebot/2.1)", True),
        ("curl/8.0", True),
        ("", True),
        (None, True),
    ],
)
def test_bots_are_not_visitors(agent: str | None, bot: bool) -> None:
    assert is_bot(agent) is bot


@pytest.mark.parametrize(
    ("referer", "src", "source"),
    [
        ("https://www.linkedin.com/feed/", None, "linkedin"),
        ("https://lnkd.in/abc", None, "linkedin"),
        ("https://web.whatsapp.com/", None, "whatsapp"),
        (None, "qr", "qr"),
        (None, "QR", "qr"),
        ("https://google.com", None, "other"),
        (None, "evil", "other"),
    ],
)
def test_where_visits_come_from(referer: str | None, src: str | None, source: str) -> None:
    assert source_of(referer, src) == source
