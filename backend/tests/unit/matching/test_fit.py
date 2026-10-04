from __future__ import annotations

from datetime import date

import pytest

from app.modules.brief.builder import passes_after_reading
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.matching.fit import FitParts, cosine, quick_fit, refine
from app.modules.matching.signals import canonical, has_skill, profile_signals, years_of_experience
from app.modules.profile.document import Experience, ProfileDocument, YearMonth, draft_to_document
from app.modules.radar.settings import RadarSettings
from tests.factories import sample_draft


def job(**overrides: object) -> Job:
    data: dict[str, object] = {
        "source": "jobstreet",
        "external_id": "1",
        "url": "https://example.com/1",
        "title": "AI Engineer",
        "company": "Selat Pay",
        "location": "Kuala Lumpur",
        "fingerprint": "selat pay|ai engineer",
        "detail_status": "ok",
        "description_text": "Build RAG systems with Python.",
        "insights": JobInsights(
            summary="AI role.", required_skills=["Python", "Kubernetes", "Rust"], min_years=5
        ).model_dump(),
    }
    data.update(overrides)
    return Job(**data)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("K8s", "kubernetes"), (" Postgres ", "postgresql"), ("LLMs", "large language models")],
)
def test_canonical(raw: str, expected: str) -> None:
    assert canonical(raw) == expected


def test_years_count_overlaps_once() -> None:
    document = ProfileDocument(
        experiences=[
            Experience(
                title="A",
                company="X",
                start=YearMonth(year=2020, month=1),
                end=YearMonth(year=2022, month=12),
            ),
            Experience(
                title="B",
                company="Y",
                start=YearMonth(year=2022, month=1),
                end=YearMonth(year=2023, month=12),
            ),
            Experience(title="C", company="Z", start=None),
        ]
    )
    assert years_of_experience(document, today=date(2026, 10, 4)) == 4.0


def test_has_skill_reads_bullets_and_aliases() -> None:
    signals = profile_signals(draft_to_document(sample_draft()))
    assert has_skill(signals, "K8s")  # listed as Kubernetes
    assert has_skill(signals, "RAG")  # appears in an achievement
    assert not has_skill(signals, "Rust")


def test_quick_fit_parts() -> None:
    document = draft_to_document(sample_draft())  # ~6.7 years of experience
    radar = RadarSettings(
        roles=["AI Engineer"], anywhere=False, places=["kuala_lumpur"], seniority=["senior"]
    )
    fit = quick_fit(job(), profile_signals(document), radar, None)
    assert fit.matched_skills == ["Python", "Kubernetes"]
    assert fit.missing_skills == ["Rust"]
    assert fit.parts.role == 100
    assert fit.parts.experience == 100
    assert fit.parts.location == 100
    assert fit.parts.similarity == 60  # no vectors yet
    assert 0 < fit.parts.score <= 100


def test_role_part_penalises_far_levels() -> None:
    document = draft_to_document(sample_draft())
    radar = RadarSettings(roles=["AI Engineer"], seniority=["senior"])
    intern = quick_fit(job(title="AI Engineer Intern"), profile_signals(document), radar, None)
    assert intern.parts.role < 80


def test_weights_and_refine() -> None:
    parts = FitParts(skills=100, role=100, experience=100, location=100, pay=100, similarity=100)
    assert parts.score == 100
    refined = refine(parts, skill_coverage=0, experience_fit=0)
    assert refined.skills == 35
    assert refined.experience == 50
    assert refined.score < parts.score


def test_cosine() -> None:
    assert cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    assert cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)
    assert cosine(None, [1.0]) is None


def test_insights_tidy() -> None:
    tidy = JobInsights(
        summary="  x  ",
        required_skills=["Python", "python", " ", *[f"S{i}" for i in range(20)]],
        min_years=99,
        salary_min=5,
        salary_max=None,
    ).tidy()
    assert tidy.required_skills[0] == "Python"
    assert len(tidy.required_skills) == 12
    assert tidy.min_years is None
    assert tidy.salary_min is None


def test_reading_can_rule_a_job_out() -> None:
    radar = RadarSettings(roles=["AI Engineer"], work_modes=["remote"], seniority=["senior"])
    onsite = job(insights=JobInsights(summary="x", work_mode="onsite").model_dump())
    assert not passes_after_reading(onsite, radar)
    junior = job(
        work_mode="remote", insights=JobInsights(summary="x", seniority="intern").model_dump()
    )
    assert not passes_after_reading(junior, radar)
    fine = job(
        work_mode="remote", insights=JobInsights(summary="x", seniority="senior").model_dump()
    )
    assert passes_after_reading(fine, radar)
