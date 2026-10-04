from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.modules.profile.document import draft_to_document
from app.modules.radar.filters import apply_filters, duplicate_key, infer_seniority, infer_work_mode
from app.modules.radar.locations import guess_place, places_in
from app.modules.radar.relevance import keyword_match
from app.modules.radar.schedule import next_brief_at
from app.modules.radar.service import build_queries, defaults_from_profile
from app.modules.radar.settings import RadarSettings
from app.modules.sources.base import JobCard, WorkMode
from tests.factories import sample_draft

NOW = datetime(2026, 10, 4, 6, 0, tzinfo=UTC)  # Sunday 14:00 in Kuala Lumpur


def card(**overrides: object) -> JobCard:
    data: dict[str, object] = {
        "source": "jobstreet",
        "external_id": "1",
        "url": "https://example.com/1",
        "title": "AI Engineer",
        "company": "Selat Pay Sdn Bhd",
        "location": "Kuala Lumpur",
        "posted_at": NOW - timedelta(hours=3),
    }
    data.update(overrides)
    return JobCard.model_validate(data)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Petaling Jaya, Selangor, Malaysia", {"selangor"}),
        ("Cyberjaya", {"selangor"}),
        ("Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia", {"kuala_lumpur"}),
        ("Greater Kuala Lumpur", {"kuala_lumpur", "selangor"}),
        ("Bayan Lepas, Penang", {"penang"}),
        ("JB", {"johor"}),
        ("Malaysia", set()),
        (None, set()),
    ],
)
def test_places_in(text: str | None, expected: set[str]) -> None:
    assert places_in(text) == expected


def test_guess_place_prefers_busiest() -> None:
    assert guess_place("Greater Kuala Lumpur") == "kuala_lumpur"
    assert guess_place("Somewhere else") is None


@pytest.mark.parametrize(
    ("title", "level"),
    [
        ("Senior AI Engineer", "senior"),
        ("AI Developer Intern", "intern"),
        ("Head of Data & AI", "manager"),
        ("Machine Learning Lead", "lead"),
        ("Junior Data Analyst", "entry"),
        ("AI Engineer", None),
    ],
)
def test_infer_seniority(title: str, level: str | None) -> None:
    assert infer_seniority(title) == level


def test_infer_work_mode_from_text() -> None:
    assert infer_work_mode(card(location="Remote")) == WorkMode.REMOTE
    assert infer_work_mode(card(title="AI Engineer (Hybrid)")) == WorkMode.HYBRID
    assert infer_work_mode(card(work_mode="onsite")) == WorkMode.ONSITE
    assert infer_work_mode(card()) is None


def test_filters_count_every_reason() -> None:
    settings = RadarSettings(
        roles=["AI Engineer"],
        anywhere=False,
        places=["kuala_lumpur"],
        work_modes=[WorkMode.ONSITE, WorkMode.HYBRID],
        seniority=["mid", "senior"],
        salary_min=8000,
        exclude_keywords=["sales"],
        exclude_companies=["Rimba"],
        freshness_days=3,
    )
    cards = [
        card(external_id="ok"),
        card(external_id="old", posted_at=NOW - timedelta(days=5)),
        card(external_id="far", location="Penang"),
        card(external_id="remote", work_mode="remote"),
        card(external_id="intern", title="AI Engineer Intern"),
        card(external_id="cheap", salary_min=3000, salary_max=4000),
        card(external_id="sales", title="AI Engineer (Sales)"),
        card(external_id="rimba", company="Rimba Health"),
        card(
            external_id="dupe",
            source="linkedin",
            company="Selat Pay",
            salary_min=9000,
            salary_max=12000,
        ),
    ]
    result = apply_filters(cards, settings, NOW)
    assert [c.external_id for c in result.kept] == ["dupe"]  # richer duplicate replaces the first
    assert dict(result.dropped) == {
        "too_old": 1,
        "location": 1,
        "work_mode": 1,
        "seniority": 1,
        "salary": 1,
        "excluded_word": 1,
        "excluded_company": 1,
        "duplicate": 1,
    }


def test_missing_data_never_drops_a_job() -> None:
    settings = RadarSettings(
        roles=["AI Engineer"], anywhere=False, places=["penang"], salary_min=5000
    )
    result = apply_filters([card(location="Malaysia", posted_at=None)], settings, NOW)
    assert len(result.kept) == 1


def test_no_salary_can_be_excluded() -> None:
    settings = RadarSettings(roles=["AI Engineer"], salary_min=5000, include_no_salary=False)
    result = apply_filters([card()], settings, NOW)
    assert result.dropped["no_salary"] == 1


def test_must_have_words() -> None:
    settings = RadarSettings(roles=["AI Engineer"], must_have=["python"])
    kept = apply_filters(
        [card(snippet="Python, FastAPI"), card(external_id="2", title="AI Lead")], settings, NOW
    )
    assert [c.external_id for c in kept.kept] == ["1"]


def test_duplicate_key_ignores_company_suffixes() -> None:
    assert duplicate_key(card(company="Selat Pay Sdn. Bhd.")) == duplicate_key(
        card(company="SELAT PAY")
    )


def test_settings_validation() -> None:
    with pytest.raises(ValidationError):
        RadarSettings(roles=["x"], brief_time="7am")
    with pytest.raises(ValidationError):
        RadarSettings(roles=["x"], brief_days=[])
    with pytest.raises(ValidationError):
        RadarSettings(roles=["x"], anywhere=False, places=[], work_modes=[WorkMode.ONSITE])
    tidy = RadarSettings(
        roles=[" AI  Engineer ", "ai engineer", "", "Data Scientist"], places=["nowhere", "penang"]
    )
    assert tidy.roles == ["AI Engineer", "Data Scientist"]
    assert tidy.places == ["penang"]


def test_next_brief_respects_time_zone_and_days() -> None:
    settings = RadarSettings(
        roles=["x"], brief_time="07:00", brief_days=[0, 1, 2, 3, 4]
    )  # weekdays
    due = next_brief_at(settings, "Asia/Kuala_Lumpur", NOW)  # Sunday afternoon
    assert due == datetime(2026, 10, 4, 23, 0, tzinfo=UTC)  # Monday 07:00 MYT
    assert (
        next_brief_at(settings.model_copy(update={"paused": True}), "Asia/Kuala_Lumpur", NOW)
        is None
    )


def test_build_queries_narrow_to_one_state() -> None:
    settings = RadarSettings(
        roles=["AI Engineer", "ML Engineer"], anywhere=False, places=["penang"]
    )
    queries = build_queries(settings)
    assert [q.keywords for q in queries] == ["AI Engineer", "ML Engineer"]
    assert {q.location for q in queries} == {"Penang"}
    wide = build_queries(
        RadarSettings(roles=["AI Engineer"], anywhere=False, places=["penang", "johor"])
    )
    assert wide[0].location == "Malaysia"


def test_defaults_come_from_the_profile() -> None:
    settings = defaults_from_profile(draft_to_document(sample_draft()))
    assert settings.roles == ["AI Engineer"]  # "Senior" dropped, headline duplicate merged
    assert settings.places == ["kuala_lumpur"]
    assert settings.anywhere is False
    assert settings.seniority == ["senior"]


def test_keyword_fallback() -> None:
    roles = ["AI Engineer", "Machine Learning Engineer"]
    assert keyword_match(roles, "Senior AI Engineer")
    assert keyword_match(roles, "Machine Learning Lead")
    assert not keyword_match(roles, "Support Engineer, L1")


def test_duplicate_key_ignores_country_in_company() -> None:
    assert duplicate_key(card(company="SeaOwl Malaysia")) == duplicate_key(card(company="SeaOwl"))
