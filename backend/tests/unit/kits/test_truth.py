from __future__ import annotations

import pytest

from app.modules.jobs.paste import recognise
from app.modules.kits.checks import enforce_truth, keyword_report
from app.modules.kits.render import DASH, resume_html
from app.modules.kits.schemas import TailoredBullet, TailoredProject, TailoredResume, TailoredRole
from app.modules.profile.document import ProfileDocument, draft_to_document
from tests.factories import sample_draft


@pytest.fixture
def document() -> ProfileDocument:
    return draft_to_document(sample_draft())


def _ids(document: ProfileDocument) -> tuple[str, str, list[str], list[str]]:
    current, previous = document.experiences
    return (
        current.id,
        previous.id,
        [b.id for b in current.bullets],
        [b.id for b in previous.bullets],
    )


def _resume(roles: list[TailoredRole], skills: list[str] | None = None) -> TailoredResume:
    return TailoredResume(
        headline="AI Engineer", summary="Engineer.", roles=roles, skills=skills or ["Python"]
    )


def test_honest_lines_pass(document: ProfileDocument) -> None:
    current, previous, facts, old = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[
                    TailoredBullet(
                        text="Built a RAG assistant serving 40k staff in 3 countries.",
                        fact_ids=[facts[0]],
                    ),
                    TailoredBullet(
                        text="Reduced serving cost 38% by batching requests.", fact_ids=[facts[1]]
                    ),
                ],
            ),
            TailoredRole(
                experience_id=previous,
                bullets=[TailoredBullet(text="Raised add-to-cart by 12%.", fact_ids=[old[0]])],
            ),
        ]
    )
    cleaned, report = enforce_truth(resume, document)
    assert report.issues == []
    assert report.lines_checked == 3
    assert cleaned.roles[0].bullets[0].text.startswith("Built a RAG")


def test_invented_numbers_are_restored(document: ProfileDocument) -> None:
    current, previous, facts, old = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[
                    TailoredBullet(
                        text="Built a RAG assistant used by 90,000 staff.", fact_ids=[facts[0]]
                    )
                ],
            ),
            TailoredRole(
                experience_id=previous,
                bullets=[TailoredBullet(text="Shipped models.", fact_ids=[old[0]])],
            ),
        ]
    )
    cleaned, report = enforce_truth(resume, document)
    assert len(report.issues) == 1
    issue = report.issues[0]
    assert "90,000" in issue.problem
    assert issue.replaced_with == document.experiences[0].bullets[0].text
    assert cleaned.roles[0].bullets[0].text == document.experiences[0].bullets[0].text


def test_uncited_or_borrowed_facts_are_caught(document: ProfileDocument) -> None:
    current, previous, facts, old = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[
                    TailoredBullet(text="Led everything.", fact_ids=[]),
                    TailoredBullet(
                        text="Raised add-to-cart by 12%.", fact_ids=[old[0]]
                    ),  # another role's fact
                    TailoredBullet(text="Cut cost 38%.", fact_ids=[facts[1]]),
                ],
            )
        ]
    )
    cleaned, report = enforce_truth(resume, document)
    assert [i.problem for i in report.issues] == ["didn't cite a fact from this role"] * 2
    assert [b.text for b in cleaned.roles[0].bullets] == ["Cut cost 38%."]
    # The role the AI dropped comes back with its own facts: no hidden history.
    assert [r.experience_id for r in cleaned.roles] == [current, previous]


def test_judge_flags_and_skills_from_profile_only(document: ProfileDocument) -> None:
    current, _previous, facts, _ = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[TailoredBullet(text="Led the AI strategy.", fact_ids=[facts[2]])],
            )
        ],
        skills=["python", "Rust", "Kubernetes"],
    )
    cleaned, report = enforce_truth(resume, document, judged={(current, 0)})
    assert any(i.problem == "claimed more than your profile says" for i in report.issues)
    assert cleaned.skills == ["Python", "Kubernetes"]
    # Skills the profile doesn't have are reported apart from lines that overclaimed.
    assert report.skills_removed == ["Rust"]
    assert all(i.where != "Skills" for i in report.issues)


def test_numbers_survive_translation(document: ProfileDocument) -> None:
    """A unit letter must stand alone: the k in "kakitangan" is not "thousand"."""
    current, previous, facts, old = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[
                    TailoredBullet(
                        text="Membina pembantu RAG untuk 40,000 kakitangan di 3 negara.",
                        fact_ids=[facts[0]],
                    ),
                    TailoredBullet(
                        text="Mengurangkan kos sebanyak 38% melalui batching selama 5 months.",
                        fact_ids=[facts[1]],
                    ),
                ],
            ),
            TailoredRole(
                experience_id=previous,
                bullets=[TailoredBullet(text="Shipped models.", fact_ids=[old[0]])],
            ),
        ]
    )
    _cleaned, report = enforce_truth(resume, document)
    problems = [i.problem for i in report.issues]
    assert not any("40" in p for p in problems), problems
    assert any("5" in p for p in problems)  # "5 months" is a new number, not "5 million"


def test_placeholders_never_ship(document: ProfileDocument) -> None:
    current, _, facts, _ = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[TailoredBullet(text="Cut cost by [X%].", fact_ids=[facts[1]])],
            )
        ]
    )
    _, report = enforce_truth(resume, document)
    assert report.issues[0].problem == "had an unfilled placeholder"


def test_keyword_report_before_and_after() -> None:
    resume = TailoredResume(
        headline="x", summary="Built RAG systems with Kubernetes.", roles=[], skills=["Python"]
    )
    report = keyword_report(["Python", "Kubernetes", "Rust"], "python only", resume)
    assert report.before == 33
    assert report.after == 67
    assert report.missing == ["Rust"]


def test_resume_html_is_ats_friendly(document: ProfileDocument) -> None:
    current, _, facts, _ = _ids(document)
    resume = TailoredResume(
        headline="AI Engineer for search",
        summary="Engineer.",
        roles=[
            TailoredRole(
                experience_id=current,
                bullets=[TailoredBullet(text="Built <RAG>.", fact_ids=[facts[0]])],
            )
        ],
        projects=[TailoredProject(project_id="missing", bullets=[])],
        skills=["Python"],
    )
    html = resume_html(document, resume, "en")
    assert "Work Experience" in html
    assert f"Mar 2023 {DASH} Present" in html
    assert "&lt;RAG&gt;" in html  # escaped
    assert "<table" not in html
    malay = resume_html(document, resume, "ms")
    assert "Pengalaman Kerja" in malay
    assert f"Mac 2023 {DASH} Kini" in malay


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://www.linkedin.com/jobs/view/4466414594/", ("linkedin", "4466414594")),
        (
            "https://my.linkedin.com/jobs/view/ai-engineer-at-x-4473729650?position=1",
            ("linkedin", "4473729650"),
        ),
        (
            "https://www.linkedin.com/jobs/search/?currentJobId=4471922503&geoId=1",
            ("linkedin", "4471922503"),
        ),
        ("https://my.jobstreet.com/job/95025160", ("jobstreet", "95025160")),
        ("https://my.jobstreet.com/en/job/95025160?type=standard", ("jobstreet", "95025160")),
        ("https://careers.example.com/jobs/123", None),
    ],
)
def test_recognise_links(url: str, expected: tuple[str, str] | None) -> None:
    assert recognise(url) == expected


def test_citation_tags_in_text_are_removed(document: ProfileDocument) -> None:
    current, _, facts, _ = _ids(document)
    resume = _resume(
        [
            TailoredRole(
                experience_id=current,
                bullets=[
                    TailoredBullet(
                        text=f"Cut serving cost 38% [fact {facts[1]}].", fact_ids=[facts[1]]
                    )
                ],
            )
        ]
    )
    cleaned, report = enforce_truth(resume, document)
    assert report.issues == []
    assert cleaned.roles[0].bullets[0].text == "Cut serving cost 38%."
