"""The AI's review of one job against one profile: what fits, what's missing, why."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.ai.client import get_ai
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job

REVIEW_VERSION = "matching.review/v1"
REVIEW_SYSTEM = """\
You are a candid recruiter in Malaysia. You compare one candidate's profile with one job and
explain the fit to the candidate, as "you". Use only facts in the profile and the job.

- headline: one sentence on the overall fit, naming the strongest link
  (for example "Your RAG assistant work maps straight onto their support chatbot.").
- why: two or three reasons, each tied to a specific fact from the profile.
- matched: up to six of the job's requirements the profile clearly shows (short phrases).
- missing: up to five requirements the profile doesn't show. Don't list things the profile shows.
- gaps: up to three gaps worth acting on. text: the gap itself in at most eight words
  ("No computer vision experience"). kind: skill, experience, credential or other.
  tip: one practical sentence on how to address it in the application, or what to learn.
- Keep each reason under 30 words.
- skill_coverage: 0 to 100, the share of the job's must-have skills the profile gives evidence for.
- experience_fit: 0 to 100, how well the candidate's level and years fit what the job asks.
Be honest: a weak fit should read as a weak fit.
"""


class Gap(BaseModel):
    text: str
    kind: Literal["skill", "experience", "credential", "other"]
    tip: str


class FitReview(BaseModel):
    headline: str
    why: list[str] = Field(default_factory=list)
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    gaps: list[Gap] = Field(default_factory=list)
    skill_coverage: int = Field(ge=0, le=100)
    experience_fit: int = Field(ge=0, le=100)

    def tidy(self) -> FitReview:
        return self.model_copy(
            update={
                "headline": self.headline.strip()[:300],
                "why": [w.strip() for w in self.why if w.strip()][:3],
                "matched": [m.strip()[:80] for m in self.matched if m.strip()][:6],
                "missing": [m.strip()[:80] for m in self.missing if m.strip()][:5],
                "gaps": self.gaps[:3],
            }
        )


def job_as_text(job: Job, max_chars: int = 3500) -> str:
    insights = JobInsights.model_validate(job.insights) if job.insights else None
    lines = [
        f"Title: {job.title}",
        f"Company: {job.company}",
        f"Location: {job.location or 'not stated'}",
    ]
    if insights:
        lines.append(f"Summary: {insights.summary}")
        if insights.required_skills:
            lines.append("Must-have skills: " + ", ".join(insights.required_skills))
        if insights.nice_skills:
            lines.append("Nice to have: " + ", ".join(insights.nice_skills))
        if insights.min_years is not None:
            lines.append(f"Minimum experience: {insights.min_years} years")
        if insights.languages:
            lines.append("Languages: " + ", ".join(insights.languages))
    lines.append("\nDescription:\n" + job.text_for_reading[:max_chars])
    return "\n".join(lines)


async def review_fit(job: Job, profile_text: str, *, user_id: uuid.UUID) -> FitReview:
    review = await get_ai().structured(
        [
            {"role": "system", "content": REVIEW_SYSTEM},
            {
                "role": "user",
                "content": f"CANDIDATE PROFILE\n{profile_text}\n\nJOB\n{job_as_text(job)}",
            },
        ],
        FitReview,
        purpose="matching.review",
        user_id=user_id,
        temperature=0.2,
        max_tokens=1200,
    )
    return review.tidy()
