"""The demo account's fixed content: who she is, what she's looking for, her portfolio.

Everything here is invented for the demo (people, employers and numbers), and the rest of
the demo data only ever cites these facts, so the truth rules hold for it too.
"""

from __future__ import annotations

from typing import Any

from app.modules.profile.document import (
    BasicsDraft,
    BulletDraft,
    CertificationDraft,
    EducationDraft,
    ExperienceDraft,
    LanguageDraft,
    LinkDraft,
    ProfileDraft,
    ProjectDraft,
    SkillDraft,
    YearMonth,
)
from app.modules.radar.settings import RadarSettings

DEMO_EMAIL = "demo@tailr.app"
DEMO_USERNAME = "demo"
DEMO_NAME = "Nur Aina Rahman"
DEMO_SLUG = "demo"
DEMO_TIMEZONE = "Asia/Kuala_Lumpur"

# The facts other demo data quotes, by a short key (resolved to profile ids at seed time).
FACTS = {
    "rag": "Built a RAG assistant on internal policies used by 40,000 staff across 3 countries.",
    "cost": "Cut model-serving cost by 38% by introducing request batching and quantised models.",
    "lead": "Led a team of 4 engineers delivering fraud-alert explanations for the risk team.",
    "evals": "Set up an evaluation pipeline that checks 1,200 answers every night before release.",
    "hr": "Reduced policy questions sent to HR by 50% in the first quarter after launch.",
    "recs": "Shipped a product recommendation model that raised add-to-cart rate by 12%.",
    "k8s": (
        "Migrated training jobs to Kubernetes, reducing weekly retraining time from 9 hours to 2."
    ),
    "features": "Built a feature store serving 30 million events a day to 6 models.",
    "labels": "Cleaned and labelled 50,000 customer reviews for a Malay sentiment model.",
    "p_rag": (
        "Answers questions for 40,000 staff across 3 countries, with a source for every answer."
    ),
    "p_recs": "Raised add-to-cart rate by 12% in a 4-week A/B test.",
    "p_data": "Published 50,000 labelled Malay reviews; starred 300 times on GitHub.",
}


def profile_draft() -> ProfileDraft:
    return ProfileDraft(
        basics=BasicsDraft(
            full_name=DEMO_NAME,
            headline="Senior AI Engineer",
            email="aina.demo@example.com",
            phone="+60 12-345 6789",
            location="Kuala Lumpur, Malaysia",
            summary=(
                "AI engineer with 6 years of experience building search, chat and "
                "recommendation systems for banking and e-commerce. I care about evaluation, "
                "serving cost and AI that people actually use."
            ),
            links=[
                LinkDraft(label="LinkedIn", url="https://www.linkedin.com/in/ainarahman-demo"),
                LinkDraft(label="GitHub", url="https://github.com/ainarahman-demo"),
            ],
        ),
        experiences=[
            ExperienceDraft(
                title="Senior AI Engineer",
                company="Selat Pay",
                location="Kuala Lumpur",
                employment_type="full_time",
                start=YearMonth(year=2023, month=3),
                current=True,
                summary="AI for a regional payments company: staff assistants and risk tools.",
                bullets=[
                    BulletDraft(text=FACTS[key]) for key in ("rag", "cost", "lead", "evals", "hr")
                ],
            ),
            ExperienceDraft(
                title="Machine Learning Engineer",
                company="Rimba Commerce",
                location="Petaling Jaya",
                employment_type="full_time",
                start=YearMonth(year=2020, month=1),
                end=YearMonth(year=2023, month=2),
                bullets=[BulletDraft(text=FACTS[key]) for key in ("recs", "k8s", "features")],
            ),
            ExperienceDraft(
                title="Data Science Intern",
                company="Kilat Analytics",
                location="Cyberjaya",
                employment_type="internship",
                start=YearMonth(year=2019, month=6),
                end=YearMonth(year=2019, month=12),
                bullets=[BulletDraft(text=FACTS["labels"])],
            ),
        ],
        education=[
            EducationDraft(
                institution="Universiti Malaya",
                qualification="BSc Computer Science",
                field="Artificial Intelligence",
                start_year=2015,
                end_year=2019,
                grade="First Class Honours",
            )
        ],
        projects=[
            ProjectDraft(
                name="Policy assistant",
                role="Tech lead",
                url="https://github.com/ainarahman-demo/policy-assistant",
                summary="A RAG assistant that answers staff questions from internal policies.",
                bullets=[BulletDraft(text=FACTS["p_rag"])],
            ),
            ProjectDraft(
                name="Basket recommendations",
                role="ML engineer",
                summary="Product recommendations for an e-commerce basket page.",
                bullets=[BulletDraft(text=FACTS["p_recs"])],
            ),
            ProjectDraft(
                name="Malay reviews dataset",
                role="Maintainer",
                url="https://github.com/ainarahman-demo/malay-reviews",
                summary="An open dataset of labelled Malay product reviews.",
                bullets=[BulletDraft(text=FACTS["p_data"])],
            ),
        ],
        skills=[
            *(
                SkillDraft(name=name, category="technical", level="expert")
                for name in ("Python", "Machine learning", "Retrieval-augmented generation")
            ),
            *(
                SkillDraft(name=name, category="technical", level="strong")
                for name in ("MLOps", "NLP", "Recommendation systems")
            ),
            *(
                SkillDraft(name=name, category="tool", level="strong")
                for name in (
                    "FastAPI",
                    "PyTorch",
                    "LangChain",
                    "PostgreSQL",
                    "Kubernetes",
                    "Docker",
                    "AWS",
                    "SQL",
                )
            ),
            SkillDraft(name="Banking", category="domain"),
            SkillDraft(name="E-commerce", category="domain"),
            SkillDraft(name="Stakeholder management", category="soft"),
            SkillDraft(name="Mentoring", category="soft"),
        ],
        certifications=[
            CertificationDraft(
                name="AWS Certified Machine Learning \u2013 Specialty",
                issuer="Amazon Web Services",
                issued=YearMonth(year=2022, month=5),
            )
        ],
        languages=[
            LanguageDraft(name="English", proficiency="fluent"),
            LanguageDraft(name="Bahasa Malaysia", proficiency="native"),
            LanguageDraft(name="Mandarin", proficiency="conversational"),
        ],
    )


def radar_settings() -> RadarSettings:
    return RadarSettings(
        roles=["AI Engineer", "Machine Learning Engineer", "MLOps Engineer"],
        anywhere=True,
        seniority=["senior", "lead"],
        salary_min=9000,
        must_have=["Python"],
        freshness_days=7,
        min_fit=60,
        brief_time="07:30",
        brief_days=[0, 1, 2, 3, 4],
        email_brief=False,  # the demo never sends email
    )


# Portfolio words, in her voice. Case studies are keyed by project name here and by
# project id once the profile exists.
PORTFOLIO: dict[str, Any] = {
    "hero_line": "I build AI that bank staff actually use.",
    "about": [
        "I'm a senior AI engineer at Selat Pay in Kuala Lumpur. I build retrieval systems "
        "that thousands of colleagues use every day.",
        "I started in e-commerce at Rimba Commerce, shipping recommendation models. Moving "
        "a model from a notebook to Kubernetes taught me that the engineering around a "
        "model matters as much as the model.",
        "Next, I want to lead a team that puts AI in front of real customers. Outside work "
        "I play badminton and hunt for the best char kuey teow in town.",
    ],
    "currently": "Building search for 40,000 staff at Selat Pay",
    "interests": ["Badminton", "Street food", "Open source"],
    "expertise": [
        {
            "title": "Retrieval and RAG",
            "description": "I build assistants that answer from a company's own documents, "
            "so staff stop searching.",
            "tools": ["Python", "LangChain", "PostgreSQL"],
        },
        {
            "title": "MLOps",
            "description": "I take models from a notebook to production, so they keep "
            "working after launch.",
            "tools": ["Kubernetes", "Docker", "AWS"],
        },
        {
            "title": "Recommendations",
            "description": "I build models that show people what they're likely to want next.",
            "tools": ["PyTorch", "Python"],
        },
    ],
    "awards": [
        {
            "title": "Innovation Award",
            "issuer": "Selat Pay",
            "year": 2024,
            "detail": "For the internal policy assistant.",
        }
    ],
    "testimonials": [
        {
            "quote": "Aina turned a vague idea into a tool the whole bank uses. She explains "
            "hard things simply, and her team ships.",
            "name": "Wei Ling Tan",
            "role": "Head of Data",
            "relationship": "Managed Aina at Selat Pay",
        },
        {
            "quote": "The calmest engineer in any incident. Our recommendation work only "
            "reached production because she built the pipeline around it.",
            "name": "Arjun Pillai",
            "role": "Engineering Manager",
            "relationship": "Worked with Aina at Rimba Commerce",
        },
    ],
    "case_studies": {
        "Policy assistant": {
            "overview": "A RAG assistant that answers staff questions from internal "
            "policies, with sources.",
            "role": "I led the build as tech lead.",
            "timeline": "2023 \u2013 2024",
            "team": "4 engineers",
            "problem": "Staff spent hours searching policy documents, and HR answered the "
            "same questions again and again.",
            "approach": [
                "Kept answers grounded: every answer cites the policy paragraph it came "
                "from, at the cost of shorter replies.",
                "Started with one country's policies, then expanded once accuracy held.",
                "Checked 1,200 answers every night before each release.",
            ],
            "outcome": "Answers questions for 40,000 staff across 3 countries, and cut "
            "policy questions to HR by half in the first quarter.",
            "lessons": "Evaluation first: the nightly checks caught regressions that "
            "demos never would.",
            "tools": ["Python", "LangChain", "PostgreSQL", "Kubernetes"],
        },
        "Basket recommendations": {
            "overview": "Product recommendations for an e-commerce basket page.",
            "role": "I built the model and its training pipeline.",
            "timeline": "2021 \u2013 2022",
            "problem": "The basket page showed the same best-sellers to everyone.",
            "approach": [
                "Trained on basket co-occurrence, then personalised with recent views.",
                "Moved retraining onto Kubernetes so the model stayed fresh every week.",
            ],
            "outcome": "Raised add-to-cart rate by 12% in a 4-week A/B test.",
            "tools": ["PyTorch", "Python", "Kubernetes"],
        },
        "Malay reviews dataset": {
            "overview": "An open dataset of labelled Malay product reviews.",
            "role": "I maintain it.",
            "outcome": "50,000 labelled reviews, starred 300 times on GitHub.",
            "tools": ["Python"],
        },
    },
    "layout": "one_page",
    "contact_form": True,
}

# Highlights: (value, label, fact key). Each number is in its fact.
HIGHLIGHTS = [
    ("40,000", "staff use the policy assistant I built", "rag"),
    ("38%", "lower model-serving cost", "cost"),
    ("12%", "more add-to-cart from my recommendations", "recs"),
    ("1,200", "answers checked every night before release", "evals"),
]

# Cover pictures for the projects: (title shown on the mock screen, two gradient colours).
COVERS = {
    "Policy assistant": ("Ask about any policy", "#1F5BFF", "#0B1E3A"),
    "Basket recommendations": ("You may also like", "#E02D3C", "#FFB703"),
    "Malay reviews dataset": ("50,000 reviews", "#0F766E", "#134E4A"),
}
GALLERY = {"Policy assistant": [("Answer with sources", "#0F766E", "#115E59")]}
