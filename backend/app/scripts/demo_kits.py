"""The demo's two finished Apply Kits. Every resume line cites the fact it restates."""

from __future__ import annotations

from typing import Any

from app.modules.kits.schemas import (
    CoverLetter,
    FactCheck,
    FactIssue,
    InterviewQuestion,
    KeywordReport,
    KitExtras,
    ScreeningAnswer,
    TailoredBullet,
    TailoredProject,
    TailoredResume,
    TailoredRole,
)
from app.modules.profile.document import ProfileDocument
from app.scripts.demo_data import FACTS


def fact_ids(document: ProfileDocument) -> dict[str, str]:
    """Each fact key in `FACTS` → the bullet id it has in this profile."""
    by_text = {text: fact_id for fact_id, _, text in document.facts()}
    return {key: by_text[text] for key, text in FACTS.items()}


def _role_ids(document: ProfileDocument) -> dict[str, str]:
    return {role.company: role.id for role in document.experiences}


def _project_ids(document: ProfileDocument) -> dict[str, str]:
    return {project.name: project.id for project in document.projects}


def _line(text: str, key: str, ids: dict[str, str]) -> TailoredBullet:
    return TailoredBullet(text=text, fact_ids=[ids[key]])


def _resume(
    document: ProfileDocument, headline: str, summary: str, order: list[str], skills: list[str]
) -> TailoredResume:
    ids, roles, projects = fact_ids(document), _role_ids(document), _project_ids(document)
    lines = {
        "rag": (
            "Built a RAG assistant on internal policies, used by 40,000 staff across 3 countries."
        ),
        "evals": "Set up a nightly evaluation pipeline that checks 1,200 answers before release.",
        "cost": "Cut model-serving cost by 38% with request batching and quantised models.",
        "lead": "Led a team of 4 engineers delivering fraud-alert explanations for the risk team.",
        "hr": "Reduced policy questions sent to HR by 50% in the first quarter after launch.",
        "recs": "Shipped a product recommendation model that raised add-to-cart rate by 12%.",
        "k8s": "Moved training jobs to Kubernetes, cutting weekly retraining from 9 hours to 2.",
        "features": "Built a feature store serving 30 million events a day to 6 models.",
    }
    selat = [key for key in order if key in {"rag", "evals", "cost", "lead", "hr"}]
    rimba = [key for key in order if key in {"recs", "k8s", "features"}]
    return TailoredResume(
        headline=headline,
        summary=summary,
        roles=[
            TailoredRole(
                experience_id=roles["Selat Pay"],
                bullets=[_line(lines[key], key, ids) for key in selat],
            ),
            TailoredRole(
                experience_id=roles["Rimba Commerce"],
                bullets=[_line(lines[key], key, ids) for key in rimba],
            ),
            TailoredRole(
                experience_id=roles["Kilat Analytics"],
                bullets=[_line(FACTS["labels"], "labels", ids)],
            ),
        ],
        projects=[
            TailoredProject(
                project_id=projects["Policy assistant"],
                bullets=[_line(FACTS["p_rag"], "p_rag", ids)],
            )
        ],
        skills=skills,
    )


def teratai_kit(document: ProfileDocument) -> dict[str, Any]:
    """Senior AI Engineer at Teratai Bank: built, not yet sent."""
    ids = fact_ids(document)
    resume = _resume(
        document,
        headline="Senior AI Engineer: retrieval systems for banking",
        summary="AI engineer with 6 years of experience building search, chat and "
        "recommendation systems for banking and e-commerce, including a RAG assistant "
        "used by 40,000 staff.",
        order=["rag", "evals", "cost", "lead", "hr", "k8s", "features"],
        skills=[
            "Python",
            "Retrieval-augmented generation",
            "LangChain",
            "PostgreSQL",
            "Kubernetes",
            "AWS",
            "FastAPI",
            "MLOps",
        ],
    )
    letter = CoverLetter(
        greeting="Dear Hiring Team at Teratai Bank,",
        paragraphs=[
            "You want GenAI assistants built on the bank's own documents, with evaluation "
            "and cost in mind. That is the work I do every day at Selat Pay.",
            "I built a RAG assistant on internal policies that 40,000 staff across 3 "
            "countries now use, and it cut policy questions to HR by 50% in its first "
            "quarter. Every night, a pipeline I set up checks 1,200 answers before release.",
            "I also care about running costs: I cut model-serving cost by 38% with request "
            "batching and quantised models. I'd love to bring the same habits to Teratai Bank.",
        ],
        closing="Kind regards,",
    )
    extras = KitExtras(
        screening=[
            ScreeningAnswer(
                question="Why do you want to join Teratai Bank?",
                answer="You're building the kind of internal assistant I've already taken "
                "from idea to 40,000 users, and I want to do it again at a bank's scale.",
            ),
            ScreeningAnswer(
                question="What are your salary expectations?",
                answer="Within the RM 12,000 to RM 16,000 range in your ad. I'm happy to "
                "discuss the full package.",
            ),
        ],
        recruiter_message="Hi, I saw the Senior AI Engineer role. I built a RAG assistant "
        "used by 40,000 staff at Selat Pay and would love to talk about Teratai Bank's plans.",
        interview=[
            InterviewQuestion(
                question="How do you stop a RAG assistant from making things up?",
                why_they_ask="Wrong answers about policy are a real risk for a bank.",
                your_story="Every answer cites the policy paragraph it came from, and a "
                "nightly pipeline checks 1,200 answers before each release.",
                fact_ids=[ids["p_rag"], ids["evals"]],
            ),
            InterviewQuestion(
                question="How would you keep serving costs down at scale?",
                why_they_ask="A bank-wide rollout multiplies every cost.",
                your_story="At Selat Pay I cut model-serving cost by 38% with request "
                "batching and quantised models.",
                fact_ids=[ids["cost"]],
            ),
        ],
    )
    check = FactCheck(
        lines_checked=10,
        issues=[
            FactIssue(
                where="Senior AI Engineer at Selat Pay, line 3",
                problem="Said 40% where your profile says 38%.",
                fixed=True,
                original="Cut model-serving cost by 40% with request batching.",
                replaced_with=resume.roles[0].bullets[2].text,
            )
        ],
        skills_removed=["Vector databases"],
    )
    keywords = KeywordReport(
        before=63,
        after=88,
        covered=[
            "Python",
            "Retrieval-augmented generation",
            "LangChain",
            "PostgreSQL",
            "Kubernetes",
            "AWS",
            "LLM evaluation",
        ],
        missing=["Vector databases"],
    )
    return _dump(resume, letter, extras, check, keywords)


def gajah_kit(document: ProfileDocument) -> dict[str, Any]:
    """Lead Machine Learning Engineer at Gajah Logistics: sent a week ago."""
    ids = fact_ids(document)
    resume = _resume(
        document,
        headline="Machine learning engineer who leads, and keeps models in production",
        summary="AI engineer with 6 years of experience shipping models to production, "
        "from a feature store serving 30 million events a day to retraining on Kubernetes.",
        order=["lead", "cost", "rag", "k8s", "features", "recs"],
        skills=["Python", "PyTorch", "MLOps", "Kubernetes", "Docker", "SQL", "Mentoring"],
    )
    letter = CoverLetter(
        greeting="Dear Gajah Logistics team,",
        paragraphs=[
            "You need someone to lead a team and keep forecasting models healthy in "
            "production. I've done both.",
            "At Rimba Commerce I moved training jobs to Kubernetes, cutting weekly "
            "retraining from 9 hours to 2, and built a feature store serving 30 million "
            "events a day to 6 models. At Selat Pay I lead a team of 4 engineers.",
            "I'd like to bring that mix of hands-on MLOps and leadership to your team.",
        ],
        closing="Best regards,",
    )
    extras = KitExtras(
        screening=[
            ScreeningAnswer(
                question="Tell us about a team you've led.",
                answer="I lead a team of 4 engineers at Selat Pay that delivered "
                "fraud-alert explanations for the risk team.",
            )
        ],
        recruiter_message="Hi, I applied for the Lead ML Engineer role. I've run models "
        "on Kubernetes at scale and lead a team of 4; happy to share more.",
        interview=[
            InterviewQuestion(
                question="How do you keep a model fresh in production?",
                why_they_ask="Forecasts go stale fast in logistics.",
                your_story="At Rimba Commerce I moved training jobs onto Kubernetes, "
                "cutting weekly retraining from 9 hours to 2.",
                fact_ids=[ids["k8s"]],
            )
        ],
    )
    check = FactCheck(lines_checked=9)
    keywords = KeywordReport(
        before=83,
        after=100,
        covered=["Python", "PyTorch", "MLOps", "Kubernetes", "Docker", "SQL"],
    )
    return _dump(resume, letter, extras, check, keywords)


def _dump(
    resume: TailoredResume,
    letter: CoverLetter,
    extras: KitExtras,
    check: FactCheck,
    keywords: KeywordReport,
) -> dict[str, Any]:
    return {
        "resume": resume.model_dump(mode="json"),
        "cover_letter": letter.model_dump(mode="json"),
        "extras": extras.model_dump(mode="json"),
        "fact_check": check.model_dump(mode="json"),
        "keywords": keywords.model_dump(mode="json"),
    }
