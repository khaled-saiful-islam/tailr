"""What the AI reads from a job description, once per job."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Seniority = Literal["intern", "entry", "mid", "senior", "lead", "manager"]

INSIGHTS_VERSION = "jobs.insights/v1"
INSIGHTS_SYSTEM = """\
You read job descriptions and pull out the facts a candidate needs. Copy facts; never guess.

- summary: two plain sentences: what the job is, and what it needs most.
- required_skills: at most 12 concrete skills, tools, technologies or methods the ad requires,
  as short canonical names ("Python", "Kubernetes", "RAG", "Stakeholder management").
  Not processes, committees, teams or company names.
- nice_skills: at most 8, the ones marked preferred, a plus or nice to have.
- min_years: the minimum years of experience if stated, else null.
- seniority: from the ad's wording (intern, entry, mid, senior, lead, manager), else null.
- work_mode: onsite, hybrid or remote only if stated, else null.
- employment_type: full_time, part_time, contract or internship only if stated, else null.
- salary_min and salary_max: monthly ringgit only if the ad states pay, else null.
- languages: spoken languages required (Mandarin, Bahasa Malaysia, Cantonese), not programming
  languages.
- education: the minimum qualification if stated (for example "Bachelor's in Computer Science"),
  else null.
- agency: true if a recruitment agency posts it for a client.
- concerns: at most 3 things a candidate should know before applying, only if clearly in the ad
  (for example "Commission-only pay", "Six-day work week", "Frequent travel"). Usually empty.
"""


class JobInsights(BaseModel):
    summary: str
    required_skills: list[str] = Field(default_factory=list)
    nice_skills: list[str] = Field(default_factory=list)
    min_years: int | None = None
    seniority: Seniority | None = None
    work_mode: Literal["onsite", "hybrid", "remote"] | None = None
    employment_type: Literal["full_time", "part_time", "contract", "internship"] | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    languages: list[str] = Field(default_factory=list)
    education: str | None = None
    agency: bool = False
    concerns: list[str] = Field(default_factory=list)

    def tidy(self) -> JobInsights:
        """Trim lists and drop impossible numbers the model may produce."""

        def unique(items: list[str], limit: int) -> list[str]:
            seen: set[str] = set()
            out = []
            for item in items:
                value = item.strip()[:60]
                if value and value.casefold() not in seen:
                    seen.add(value.casefold())
                    out.append(value)
            return out[:limit]

        years = self.min_years if self.min_years is not None and 0 <= self.min_years <= 30 else None
        low = self.salary_min if self.salary_min and 300 <= self.salary_min <= 300_000 else None
        high = self.salary_max if self.salary_max and 300 <= self.salary_max <= 300_000 else None
        return self.model_copy(
            update={
                "summary": self.summary.strip()[:600],
                "required_skills": unique(self.required_skills, 12),
                "nice_skills": unique(self.nice_skills, 8),
                "languages": unique(self.languages, 5),
                "concerns": unique(self.concerns, 3),
                "min_years": years,
                "salary_min": low,
                "salary_max": high or low,
            }
        )
