"""The demo's job matches: fictional Malaysian employers, honest reviews.

Every "why" in a review restates one of the demo profile's facts; gaps are things the
profile genuinely doesn't show. `days` is how long ago Tailr matched the job (0 = today's
brief); `stage` is where it sits on the tracker, if anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class DemoJob:
    key: str
    source: str
    title: str
    company: str
    location: str
    mode: str
    days: int
    parts: dict[str, int]
    required: list[str]
    nice: list[str]
    summary: str
    headline: str
    why: list[str]
    gaps: list[dict[str, str]] = field(default_factory=list)
    pay: tuple[int, int] | None = None
    min_years: int | None = None
    seniority: str | None = None
    status: str = "new"


def _parts(
    skills: int, role: int, experience: int, location: int, pay: int, similarity: int
) -> dict[str, int]:
    return {
        "skills": skills,
        "role": role,
        "experience": experience,
        "location": location,
        "pay": pay,
        "similarity": similarity,
    }


JOBS: list[DemoJob] = [
    DemoJob(
        key="teratai",
        source="linkedin",
        title="Senior AI Engineer",
        company="Teratai Bank",
        location="Kuala Lumpur",
        mode="hybrid",
        days=0,
        parts=_parts(88, 100, 95, 100, 100, 86),
        required=[
            "Python",
            "Retrieval-augmented generation",
            "LangChain",
            "PostgreSQL",
            "Kubernetes",
            "AWS",
            "Vector databases",
            "LLM evaluation",
        ],
        nice=["FastAPI", "Banking"],
        summary="Build the bank's internal GenAI assistants on its own documents, with "
        "evaluation and cost in mind. Hybrid in KL, three days in the office.",
        headline="Your policy assistant for 40,000 staff is the system Teratai Bank wants built.",
        why=[
            "You built a RAG assistant on internal policies used by 40,000 staff "
            "across 3 countries.",
            "You check 1,200 answers every night before release, the evaluation "
            "habit they ask for.",
            "You cut model-serving cost by 38%, which matters for a bank-wide rollout.",
        ],
        gaps=[
            {
                "text": "No named vector database",
                "kind": "skill",
                "tip": "If the policy assistant used pgvector or similar, add it to your skills.",
            }
        ],
        pay=(12000, 16000),
        min_years=5,
        seniority="senior",
        status="saved",
    ),
    DemoJob(
        key="gajah",
        source="jobstreet",
        title="Lead Machine Learning Engineer",
        company="Gajah Logistics",
        location="Petaling Jaya, Selangor",
        mode="onsite",
        days=9,
        parts=_parts(86, 90, 92, 90, 100, 82),
        required=["Python", "PyTorch", "MLOps", "Kubernetes", "Docker", "SQL"],
        nice=["Recommendation systems", "Mentoring"],
        summary="Lead a team of five building demand forecasting and routing models, "
        "and the platform that keeps them in production.",
        headline="You've run models in production on Kubernetes and led a team: "
        "a strong match for a lead role.",
        why=[
            "You migrated training jobs to Kubernetes, cutting weekly retraining "
            "from 9 hours to 2.",
            "You built a feature store serving 30 million events a day to 6 models.",
            "You led a team of 4 engineers at Selat Pay.",
        ],
        gaps=[
            {
                "text": "No forecasting or routing work",
                "kind": "experience",
                "tip": "Point to how your recommendation work handled time and demand signals.",
            }
        ],
        pay=(14000, 18000),
        min_years=6,
        seniority="lead",
        status="saved",
    ),
    DemoJob(
        key="nusantara",
        source="linkedin",
        title="Machine Learning Engineer, Search",
        company="Nusantara Telco",
        location="Cyberjaya, Selangor",
        mode="hybrid",
        days=6,
        parts=_parts(80, 85, 90, 95, 70, 80),
        required=["Python", "NLP", "PyTorch", "SQL", "Docker"],
        nice=["Bahasa Malaysia", "Elasticsearch"],
        summary="Improve search across the telco's help centre and app, in English and Malay.",
        headline="Search plus Malay language work: your RAG and Malay data experience both count.",
        why=[
            "You built retrieval for 40,000 staff at Selat Pay.",
            "You labelled 50,000 Malay reviews for a sentiment model.",
        ],
        gaps=[
            {
                "text": "No Elasticsearch listed",
                "kind": "skill",
                "tip": "A weekend project indexing your Malay reviews dataset would show it.",
            }
        ],
        status="saved",
    ),
    DemoJob(
        key="seri",
        source="linkedin",
        title="AI Engineer, GenAI Platform",
        company="Seri Cloud",
        location="Remote, Malaysia",
        mode="remote",
        days=24,
        parts=_parts(90, 90, 90, 100, 90, 85),
        required=["Python", "FastAPI", "LangChain", "Docker", "AWS"],
        nice=["Kubernetes"],
        summary="Build the platform other teams use to ship LLM features safely.",
        headline="Your FastAPI, LangChain and AWS work lines up with their platform.",
        why=[
            "You built and run a RAG assistant used by 40,000 staff.",
            "You cut model-serving cost by 38% with batching and quantised models.",
        ],
        pay=(11000, 15000),
        min_years=4,
        seniority="senior",
        status="saved",
    ),
    DemoJob(
        key="rimbun",
        source="jobstreet",
        title="Senior Data Scientist, Personalisation",
        company="Rimbun Retail",
        location="Kuala Lumpur",
        mode="hybrid",
        days=1,
        parts=_parts(78, 80, 90, 100, 90, 79),
        required=["Python", "Recommendation systems", "SQL", "PyTorch", "A/B testing"],
        nice=["E-commerce"],
        summary="Personalise the app and website for 5 million shoppers.",
        headline="Your 12% add-to-cart lift is exactly their kind of result.",
        why=[
            "You shipped a recommendation model that raised add-to-cart rate by 12%.",
            "You've worked in e-commerce at Rimba Commerce.",
        ],
        gaps=[
            {
                "text": "A/B testing not listed as a skill",
                "kind": "skill",
                "tip": "Your 4-week A/B test counts; add A/B testing to your skills.",
            }
        ],
        pay=(10000, 13000),
        status="saved",
    ),
    DemoJob(
        key="kancil",
        source="linkedin",
        title="MLOps Engineer",
        company="Kancil Insurance",
        location="Kuala Lumpur",
        mode="onsite",
        days=2,
        parts=_parts(70, 90, 85, 100, 60, 76),
        required=["Kubernetes", "Docker", "AWS", "Terraform", "Python"],
        nice=["MLflow"],
        summary="Own the platform that trains and serves the insurer's pricing models.",
        headline="Strong on Kubernetes and serving cost; Terraform is the gap.",
        why=[
            "You migrated training jobs to Kubernetes.",
            "You cut model-serving cost by 38%.",
        ],
        gaps=[
            {
                "text": "No Terraform",
                "kind": "skill",
                "tip": "If you've written infrastructure as code, say so; "
                "otherwise it's a short course.",
            }
        ],
        status="saved",
    ),
    DemoJob(
        key="petaling",
        source="jobstreet",
        title="Applied Scientist, Fraud",
        company="Petaling Fintech",
        location="Kuala Lumpur",
        mode="hybrid",
        days=15,
        parts=_parts(65, 80, 85, 100, 80, 70),
        required=["Python", "Machine learning", "SQL", "Graph analytics"],
        nice=["Banking"],
        summary="Detect fraud rings across payments with graph models.",
        headline="Your fraud-alert explanations are relevant; graph work is new for you.",
        why=["You led a team of 4 engineers delivering fraud-alert explanations."],
        gaps=[
            {
                "text": "No graph analytics",
                "kind": "skill",
                "tip": "Mention it as an area you'd like to grow into, honestly.",
            }
        ],
        status="seen",
    ),
    DemoJob(
        key="langkawi",
        source="linkedin",
        title="AI Solutions Engineer",
        company="Langkawi Air",
        location="Sepang, Selangor",
        mode="onsite",
        days=3,
        parts=_parts(82, 85, 90, 80, 70, 78),
        required=["Python", "LangChain", "AWS", "Stakeholder management"],
        nice=["Customer service"],
        summary="Bring GenAI into the airline's customer service and operations teams.",
        headline="Your staff-facing assistant and stakeholder work match what they want.",
        why=[
            "You built an assistant 40,000 staff use and cut HR questions by 50%.",
            "Stakeholder management is on your profile.",
        ],
        pay=(9000, 12000),
        status="saved",
    ),
    DemoJob(
        key="merdeka",
        source="linkedin",
        title="Generative AI Engineer",
        company="Merdeka Health",
        location="Kuala Lumpur",
        mode="hybrid",
        days=0,
        parts=_parts(84, 95, 90, 100, 90, 84),
        required=["Python", "Retrieval-augmented generation", "PostgreSQL", "Docker"],
        nice=["Healthcare"],
        summary="Help doctors find answers in clinical guidelines, with sources.",
        headline="Grounded answers with sources: the same pattern as your policy assistant.",
        why=[
            "Every answer in your policy assistant cites its source.",
            "You run a nightly evaluation of 1,200 answers.",
        ],
        gaps=[
            {
                "text": "No healthcare background",
                "kind": "experience",
                "tip": "Lean on how you handled sensitive policy documents.",
            }
        ],
        pay=(11000, 14000),
    ),
    DemoJob(
        key="semikon",
        source="jobstreet",
        title="Machine Learning Engineer",
        company="Seri Semikon",
        location="Bayan Lepas, Penang",
        mode="onsite",
        days=0,
        parts=_parts(55, 80, 85, 60, 60, 62),
        required=["Python", "PyTorch", "Computer vision", "C++"],
        nice=["Edge devices"],
        summary="Defect detection on the factory floor with computer vision.",
        headline="A stretch: strong Python and PyTorch, but no computer vision yet.",
        why=["You list PyTorch, and shipped a recommendation model at Rimba Commerce."],
        gaps=[
            {
                "text": "No computer vision",
                "kind": "skill",
                "tip": "A small vision project would make this a real option.",
            }
        ],
    ),
    DemoJob(
        key="kata",
        source="linkedin",
        title="NLP Engineer, Bahasa Malaysia",
        company="Bayu Labs",
        location="Remote, Malaysia",
        mode="remote",
        days=0,
        parts=_parts(85, 90, 85, 100, 90, 83),
        required=["Python", "NLP", "PyTorch", "Bahasa Malaysia"],
        nice=["Open source"],
        summary="Build Malay language models for chat and search.",
        headline="Native Malay plus 50,000 labelled Malay reviews: a natural match.",
        why=[
            "You labelled 50,000 Malay reviews and published them as an open dataset.",
            "Bahasa Malaysia is your native language.",
        ],
        pay=(10000, 13000),
        status="seen",
    ),
]


def description(job: DemoJob) -> str:
    """A plain job ad assembled from the job's own fields."""
    lines = [
        f"{job.company} is hiring a {job.title} in {job.location}.",
        "",
        job.summary,
        "",
        "What you'll need:",
        *(f"- {skill}" for skill in job.required),
    ]
    if job.nice:
        lines += ["", "Nice to have:", *(f"- {skill}" for skill in job.nice)]
    if job.pay:
        lines += ["", f"Salary: RM {job.pay[0]:,} to RM {job.pay[1]:,} a month."]
    return "\n".join(lines)


def insights(job: DemoJob) -> dict[str, Any]:
    return {
        "summary": job.summary,
        "required_skills": job.required,
        "nice_skills": job.nice,
        "min_years": job.min_years,
        "seniority": job.seniority,
        "work_mode": job.mode,
        "employment_type": "full_time",
        "salary_min": job.pay[0] if job.pay else None,
        "salary_max": job.pay[1] if job.pay else None,
        "languages": ["English"],
        "education": None,
        "agency": False,
        "concerns": [],
    }
