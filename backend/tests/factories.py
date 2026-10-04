"""Reusable test data."""

from __future__ import annotations

from app.modules.profile.document import (
    BasicsDraft,
    BulletDraft,
    EducationDraft,
    ExperienceDraft,
    LanguageDraft,
    LinkDraft,
    ProfileDraft,
    SkillDraft,
    YearMonth,
)


def sample_draft() -> ProfileDraft:
    """What a good AI extraction of tests/fixtures/cv/sample_cv.pdf looks like."""
    return ProfileDraft(
        basics=BasicsDraft(
            full_name="Nur Aina Rahman",
            headline="Senior AI Engineer",
            email="aina.rahman@example.com",
            phone="+60 12-345 6789",
            location="Kuala Lumpur, Malaysia",
            summary=(
                "AI engineer with 6 years of experience building search, chat and recommendation "
                "systems for banking and e-commerce. Strong in Python, retrieval-augmented "
                "generation and MLOps."
            ),
            links=[LinkDraft(label="LinkedIn", url="linkedin.com/in/ainarahman")],
        ),
        experiences=[
            ExperienceDraft(
                title="Senior AI Engineer",
                company="Selat Pay",
                location="Kuala Lumpur",
                start=YearMonth(year=2023, month=3),
                current=True,
                bullets=[
                    BulletDraft(
                        text="Built a RAG assistant used by 40,000 staff across 3 countries."
                    ),
                    BulletDraft(text="Cut model-serving cost by 38% with request batching."),
                    BulletDraft(text="Led a team of 4 engineers delivering fraud explanations."),
                    BulletDraft(text="Responsible for evaluation pipelines."),
                ],
            ),
            ExperienceDraft(
                title="Machine Learning Engineer",
                company="Rimba Commerce",
                start=YearMonth(year=2020, month=1),
                end=YearMonth(year=2023, month=2),
                bullets=[
                    BulletDraft(
                        text="Shipped a recommendation model that raised add-to-cart by 12%."
                    )
                ],
            ),
        ],
        education=[
            EducationDraft(
                institution="Universiti Malaya", qualification="BSc Computer Science", end_year=2019
            )
        ],
        skills=[
            SkillDraft(name=name, category="tool")
            for name in [
                "Python",
                "FastAPI",
                "PyTorch",
                "PostgreSQL",
                "Kubernetes",
                "Docker",
                "AWS",
                "MLOps",
            ]
        ],
        languages=[LanguageDraft(name="English", proficiency="fluent")],
    )
