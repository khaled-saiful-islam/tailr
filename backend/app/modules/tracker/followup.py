"""The day-7 follow-up email: short, polite, and true.

The AI may add one line on why the applicant fits, taken only from their tailored
cover letter or profile. Any number it uses must appear in that source; if not, or if
the AI is unavailable, a plain template is used instead.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, Field

from app.ai.client import get_ai
from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.kits.checks import numbers_in

log = get_logger(__name__)

SYSTEM = """You write a short follow-up email from a job applicant, about a week after
they applied. Warm, confident, specific; never desperate or pushy.

Rules:
- At most 110 words in the body. Plain sentences.
- Say which role they applied for and roughly when (use the date given).
- Add at most one sentence on why they fit, using only SOURCE. Never invent a fact,
  number, name, skill, project or date.
- Ask one clear question about the timeline or next steps.
- Greet the contact by name if one is given; otherwise use a neutral greeting.
- End with the applicant's name. No placeholders in brackets.
- Write in {language}.
"""


class _Draft(BaseModel):
    subject: str = Field(max_length=140)
    body: str = Field(max_length=1400)


@dataclass(frozen=True)
class FollowUpFacts:
    applicant: str
    title: str
    company: str
    applied_on: datetime
    contact: str | None
    source: str
    language: str  # "en" | "ms"


def _date(when: datetime, language: str) -> str:
    months = (
        ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"]
        if language == "ms"
        else ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    )
    return f"{when.day} {months[when.month - 1]}"


def template(facts: FollowUpFacts) -> _Draft:
    """The fallback: nothing in it can be untrue."""
    on = _date(facts.applied_on, facts.language)
    if facts.language == "ms":
        hello = f"Salam sejahtera {facts.contact}," if facts.contact else "Salam sejahtera,"
        return _Draft(
            subject=f"Susulan permohonan: {facts.title}",
            body=(
                f"{hello}\n\n"
                f"Saya telah memohon jawatan {facts.title} di {facts.company} pada {on}, "
                "dan ingin membuat susulan. Saya masih sangat berminat dengan peranan ini "
                "dan sedia berkongsi apa-apa maklumat tambahan.\n\n"
                "Boleh saya tahu jangka masa untuk langkah seterusnya?\n\n"
                f"Terima kasih,\n{facts.applicant}"
            ),
        )
    hello = f"Hello {facts.contact}," if facts.contact else "Hello,"
    return _Draft(
        subject=f"Following up on my application: {facts.title}",
        body=(
            f"{hello}\n\n"
            f"I applied for the {facts.title} role at {facts.company} on {on}, and wanted "
            "to follow up. I'm still very interested, and happy to share anything else "
            "that would help.\n\n"
            "Could you tell me the timeline for next steps?\n\n"
            f"Thank you,\n{facts.applicant}"
        ),
    )


def _true(draft: _Draft, facts: FollowUpFacts) -> bool:
    known = numbers_in(
        " ".join(
            [
                facts.source,
                facts.title,
                facts.company,
                _date(facts.applied_on, facts.language),
                str(facts.applied_on.year),
            ]
        )
    )
    used = numbers_in(f"{draft.subject} {draft.body}")
    placeholder = "[" in draft.body or "{" in draft.body
    first = facts.applicant.split()[:1]
    signed = not first or first[0] in draft.body
    return used <= known and not placeholder and signed


async def draft_follow_up(facts: FollowUpFacts, user_id: uuid.UUID) -> tuple[str, str]:
    """A subject and body. Falls back to the template rather than risk an untrue line."""
    language = "Bahasa Malaysia" if facts.language == "ms" else "English"
    prompt = (
        f"APPLICANT: {facts.applicant}\nROLE: {facts.title}\nCOMPANY: {facts.company}\n"
        f"APPLIED ON: {_date(facts.applied_on, facts.language)}\n"
        f"CONTACT: {facts.contact or 'unknown'}\n\nSOURCE\n{facts.source[:4000]}"
    )
    try:
        draft = await get_ai().structured(
            [
                {"role": "system", "content": SYSTEM.format(language=language)},
                {"role": "user", "content": prompt},
            ],
            _Draft,
            purpose="tracker.follow_up",
            user_id=user_id,
            temperature=0.4,
            max_tokens=600,
        )
    except AppError as error:
        log.info("follow_up_ai_unavailable", error=error.message)
        draft = template(facts)
    else:
        if not _true(draft, facts):
            log.info("follow_up_draft_rejected")
            draft = template(facts)
    return draft.subject.strip(), draft.body.strip()
