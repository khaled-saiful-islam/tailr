from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.modules.sources import jobstreet, linkedin
from app.modules.sources.base import SourceError, WorkMode
from app.modules.sources.text import html_to_text, parse_relative

FIXTURES = Path(__file__).parents[2] / "fixtures" / "sources"
NOW = datetime(2026, 10, 4, 6, 0, tzinfo=UTC)


def test_linkedin_search_cards() -> None:
    cards = linkedin.parse_search((FIXTURES / "linkedin_search.html").read_text(), now=NOW)
    assert len(cards) == 10
    first = cards[0]
    assert first.source == "linkedin"
    assert first.external_id == "4466414594"
    assert first.url == "https://www.linkedin.com/jobs/view/4466414594/"
    assert first.title == "Machine Learning Lead (Data & AI Middleware)"
    assert first.company == "K3 Advisory Group"
    assert first.location == "Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia"
    assert first.posted_at is not None
    assert first.posted_at <= NOW
    assert len({c.external_id for c in cards}) == 10


def test_linkedin_job_details() -> None:
    detail = linkedin.parse_details((FIXTURES / "linkedin_job.html").read_text(), "4466414594")
    assert len(detail.description_text) > 1000
    assert "\n" in detail.description_text
    assert detail.employment_type == "Full-time"
    assert detail.industries == "Financial Services"
    assert detail.applicants == "29 applicants"


def test_linkedin_details_without_description() -> None:
    with pytest.raises(SourceError):
        linkedin.parse_details("<html><body>Sign in</body></html>", "1")


def test_jobstreet_search_cards() -> None:
    payload = json.loads((FIXTURES / "jobstreet_search.json").read_text())
    cards = jobstreet.parse_search(payload)
    assert len(cards) == 30
    first = cards[0]
    assert first.source == "jobstreet"
    assert first.url == f"https://my.jobstreet.com/job/{first.external_id}"
    assert first.title == "CHIEF OPERATING MANAGER (AI / Digital Platform)"
    assert first.company == "SEPAP SDN BHD"
    assert first.location == "Kuala Lumpur"
    assert first.salary_min == 15000
    assert first.salary_max == 20000
    assert first.work_mode == WorkMode.REMOTE
    assert first.employment_type == "full_time"
    assert first.posted_at == datetime(2026, 10, 3, 10, 0, 29, tzinfo=UTC)


def test_jobstreet_job_details() -> None:
    payload = json.loads((FIXTURES / "jobstreet_job.json").read_text())
    detail = jobstreet.parse_details(payload, "95040037")
    assert len(detail.description_text) > 500
    assert "<" not in detail.description_text


def test_jobstreet_details_missing() -> None:
    with pytest.raises(SourceError):
        jobstreet.parse_details({"data": {"jobDetails": None}}, "1")


@pytest.mark.parametrize(
    ("text", "hours"),
    [("3 hours ago", 3), ("19h ago", 19), ("2 days ago", 48), ("1 week ago", 168), ("Just now", 0)],
)
def test_relative_times(text: str, hours: int) -> None:
    result = parse_relative(text, NOW)
    assert result is not None
    assert round((NOW - result).total_seconds() / 3600) == hours


def test_relative_time_unknown() -> None:
    assert parse_relative("Reposted", NOW) is None


def test_html_to_text_keeps_structure() -> None:
    text = html_to_text(
        "<p>About the role</p><ul><li>Build RAG</li><li>Ship &amp; measure</li></ul>"
    )
    assert text == "About the role\n\n• Build RAG\n• Ship & measure"


def test_jobstreet_strips_glued_new_badge() -> None:
    payload = {
        "data": [
            {"id": "1", "title": "Backend EngineerNew", "companyName": "Bybit", "locations": [{}]}
        ]
    }
    assert jobstreet.parse_search(payload)[0].title == "Backend Engineer"
