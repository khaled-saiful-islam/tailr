"""Interview prep for one application.

The application comes with five likely questions. On request, a full plan is built in the
background: a 60-second pitch, 12 to 17 questions in five kinds (the job's skills, past work,
the skills you don't have yet, situations, why this job), questions to ask them and a
checklist. Any answer can be practised: the AI scores it and tightens it, using only what you
wrote and your profile. Plans, practice and marks live in the kit's `extras` JSON.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import get_ai
from app.core import rate_limit
from app.core.clock import utcnow
from app.core.errors import ConflictError, NotFoundError, UnprocessableError
from app.modules.auth.models import User
from app.modules.background.schemas import TaskOut
from app.modules.background.service import BackgroundService
from app.modules.brief.models import Match
from app.modules.jobs.insights import JobInsights
from app.modules.jobs.models import Job
from app.modules.kits import interview_prompts as prompts
from app.modules.kits.builder import profile_with_ids
from app.modules.kits.checks import fact_sources
from app.modules.kits.interview_checks import (
    assemble_plan,
    check_feedback,
    question_id,
    spoken_seconds,
    word_count,
)
from app.modules.kits.interview_judge import judge_answer, judge_plan
from app.modules.kits.interview_schemas import (
    MARKS_KEY,
    PITCH_ID,
    PLAN_KEY,
    PRACTICE_KEY,
    BasicQuestion,
    FeedbackDraft,
    FeedbackRequest,
    InterviewPlan,
    InterviewPrepOut,
    MarkUpdate,
    PracticeAttempt,
    SkillQuestionsDraft,
    StoryPlanDraft,
)
from app.modules.kits.models import Kit
from app.modules.kits.prompts import LANGUAGE_NAME
from app.modules.kits.schemas import KitExtras
from app.modules.matching.review import job_as_text
from app.modules.matching.signals import has_skill, profile_signals
from app.modules.profile.document import ProfileDocument
from app.modules.profile.service import ProfileService

PLANS_PER_DAY = 6
FEEDBACK_PER_HOUR = 30
MIN_ANSWER_WORDS = 12
MAX_GAPS = 3

Stage = Callable[[str], Awaitable[None]]


def _link(kit_id: uuid.UUID) -> str:
    return f"/apply/{kit_id}?tab=interview"


def basic_questions(kit: Kit) -> list[BasicQuestion]:
    extras = KitExtras.model_validate(kit.extras) if kit.extras else KitExtras()
    return [
        BasicQuestion(
            id=question_id(item.question),
            question=item.question,
            why_they_ask=item.why_they_ask,
            your_story=item.your_story,
            fact_ids=item.fact_ids,
        )
        for item in extras.interview
    ]


def stored_plan(kit: Kit) -> InterviewPlan | None:
    raw = (kit.extras or {}).get(PLAN_KEY)
    return InterviewPlan.model_validate(raw) if raw else None


def _level(insights: JobInsights | None) -> str:
    if insights is None:
        return "professional"
    words = {"intern": "internship", "entry": "entry-level", "mid": "mid-level"}
    level = words.get(insights.seniority or "", insights.seniority or "professional")
    if insights.min_years:
        level += f" ({insights.min_years}+ years)"
    return level


def own_words(document: ProfileDocument) -> list[str]:
    """Everything the candidate wrote about themselves: the only source of their numbers."""
    facts = [source.text for source in fact_sources(document).values()]
    return [*facts, document.basics.summary or "", document.basics.headline or ""]


class InterviewService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _kit(self, user: User, kit_id: uuid.UUID, *, lock: bool = False) -> Kit:
        stmt = select(Kit).where(Kit.id == kit_id)
        if lock:
            # Re-read under the lock: practice and marks may have changed since the AI started.
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        kit = (await self.db.execute(stmt)).scalar_one_or_none()
        if kit is None or kit.user_id != user.id:
            raise NotFoundError("We couldn't find that application.")
        return kit

    async def _job(self, kit: Kit) -> Job:
        job = await self.db.get(Job, kit.job_id)
        if job is None:
            raise NotFoundError("We couldn't find that job.")
        return job

    @staticmethod
    def _ready(kit: Kit) -> None:
        if kit.status != "ready":
            raise ConflictError(
                "Your application is still being prepared. Try again when it's ready.",
                code="kit_not_ready",
            )

    async def get(self, user: User, kit_id: uuid.UUID) -> InterviewPrepOut:
        kit = await self._kit(user, kit_id)
        job = await self._job(kit)
        extras = kit.extras or {}
        return InterviewPrepOut(
            kit_id=kit.id,
            job_title=job.title,
            company=job.company,
            language=kit.language,
            ready=kit.status == "ready",
            basic=basic_questions(kit),
            plan=stored_plan(kit),
            practice={
                key: PracticeAttempt.model_validate(value)
                for key, value in (extras.get(PRACTICE_KEY) or {}).items()
            },
            marks=dict(extras.get(MARKS_KEY) or {}),
        )

    def _question(self, kit: Kit, qid: str) -> tuple[str, list[str]]:
        """The question's words and what a strong answer covers, or 404 if it isn't here."""
        plan = stored_plan(kit)
        if qid == PITCH_ID and plan is not None:
            return "Tell me about yourself.", [
                "Who you are now, in one line",
                "Two proofs that matter for this job",
                "Why this role is the right next step",
            ]
        for question in plan.questions if plan else []:
            if question.id == qid:
                return question.question, question.strong_answer
        for basic in basic_questions(kit):
            if basic.id == qid:
                return basic.question, [basic.why_they_ask]
        raise NotFoundError("We couldn't find that question.", code="question_not_found")

    async def set_mark(self, user: User, kit_id: uuid.UUID, data: MarkUpdate) -> InterviewPrepOut:
        kit = await self._kit(user, kit_id, lock=True)
        self._question(kit, data.question_id)
        marks = {
            key: value
            for key, value in ((kit.extras or {}).get(MARKS_KEY) or {}).items()
            if key != data.question_id
        }
        if data.mark is not None:
            marks[data.question_id] = data.mark
        kit.extras = {**(kit.extras or {}), MARKS_KEY: marks}
        await self.db.flush()
        return await self.get(user, kit_id)

    async def start_plan(self, user: User, kit_id: uuid.UUID) -> TaskOut:
        kit = await self._kit(user, kit_id)
        self._ready(kit)
        job = await self._job(kit)
        await rate_limit.enforce(
            f"interview-plan:{user.id}",
            limit=PLANS_PER_DAY,
            window_seconds=24 * 3600,
            message="You've built a lot of interview plans today. Try again tomorrow.",
        )
        return await BackgroundService(self.db).start(
            user,
            "interview.plan",
            f"Building your interview plan for {job.title}",
            {"kit_id": str(kit_id), "language": kit.language},
            link=_link(kit_id),
        )

    async def start_feedback(self, user: User, kit_id: uuid.UUID, data: FeedbackRequest) -> TaskOut:
        kit = await self._kit(user, kit_id)
        self._ready(kit)
        self._question(kit, data.question_id)
        if word_count(data.answer) < MIN_ANSWER_WORDS:
            raise UnprocessableError(
                "Write a few sentences, the way you'd say them, so there's something to "
                "give feedback on.",
                code="answer_too_short",
            )
        await rate_limit.enforce(
            f"interview-feedback:{user.id}",
            limit=FEEDBACK_PER_HOUR,
            window_seconds=3600,
            message="That's a lot of practice for one hour. Take a break and try again soon.",
        )
        return await BackgroundService(self.db).start(
            user,
            "interview.feedback",
            "Checking your practice answer",
            {"kit_id": str(kit_id), "question_id": data.question_id, "answer": data.answer},
            link=_link(kit_id),
        )

    # ── background work ──────────────────────────────────────────────────

    async def _context(self, user: User, kit: Kit) -> tuple[Job, ProfileDocument, list[str]]:
        job = await self._job(kit)
        document = await ProfileService(self.db).document_for(user.id)
        if document is None or not document.experiences:
            raise UnprocessableError(
                "Add at least one role to your profile first.", code="profile_too_thin"
            )
        return job, document, await self._gaps(kit, job, document)

    async def _gaps(self, kit: Kit, job: Job, document: ProfileDocument) -> list[str]:
        """Must-have skills the profile doesn't show (or the fit review didn't see)."""
        if not job.insights:
            return []
        signals = profile_signals(document)
        match = await self.db.get(Match, kit.match_id) if kit.match_id else None
        seen = [m.casefold() for m in ((match.review if match else None) or {}).get("matched", [])]
        missing = [
            skill
            for skill in JobInsights.model_validate(job.insights).required_skills
            if not has_skill(signals, skill)
            and not any(skill.casefold() in m or m in skill.casefold() for m in seen)
        ]
        return missing[:MAX_GAPS]

    async def build_plan(
        self, user: User, kit_id: uuid.UUID, stage: Stage
    ) -> tuple[InterviewPlan, Job]:
        kit = await self._kit(user, kit_id)
        self._ready(kit)
        job, document, gaps = await self._context(user, kit)
        insights = JobInsights.model_validate(job.insights) if job.insights else None
        strengths = [
            s for s in (insights.required_skills if insights else []) if s not in set(gaps)
        ]
        system = {
            "language": LANGUAGE_NAME.get(kit.language, "English"),
            "level": _level(insights),
        }
        job_text = job_as_text(job, max_chars=4000)
        context = (
            f"PROFILE\n{profile_with_ids(document)}\n\nJOB\n{job_text}\n\n"
            f"STRENGTHS: {', '.join(strengths) or 'none listed'}\n"
            f"GAPS: {', '.join(gaps) or 'none'}"
        )
        await stage("Writing your questions and stories")
        ai = get_ai()
        skills, story = await asyncio.gather(
            ai.structured(
                [
                    {"role": "system", "content": prompts.SKILLS_SYSTEM.format(**system)},
                    {"role": "user", "content": context},
                ],
                SkillQuestionsDraft,
                purpose="kits.interview_plan",
                user_id=user.id,
                temperature=0.4,
                max_tokens=4500,
            ),
            ai.structured(
                [
                    {"role": "system", "content": prompts.STORY_SYSTEM.format(**system)},
                    {"role": "user", "content": context},
                ],
                StoryPlanDraft,
                purpose="kits.interview_story",
                user_id=user.id,
                temperature=0.4,
                max_tokens=4500,
            ),
        )
        await stage("Checking every story against your profile")
        plan = assemble_plan(
            skills=skills,
            story=story,
            sources=fact_sources(document),
            own_words=own_words(document),
            job_text=job_text,
            gaps=gaps,
            language=kit.language,  # type: ignore[arg-type]
            now=utcnow(),
        )
        about_me = " ".join(filter(None, [document.basics.headline, document.basics.summary]))
        plan = await judge_plan(plan, fact_sources(document), about_me, user.id)
        locked = await self._kit(user, kit_id, lock=True)
        locked.extras = {**(locked.extras or {}), PLAN_KEY: jsonable_encoder(plan)}
        await self.db.flush()
        return plan, job

    async def give_feedback(
        self, user: User, kit_id: uuid.UUID, qid: str, answer: str, stage: Stage
    ) -> PracticeAttempt:
        kit = await self._kit(user, kit_id)
        question, strong = self._question(kit, qid)
        job, document, _ = await self._context(user, kit)
        facts = "\n".join(f"- {text}" for text in own_words(document) if text)
        await stage("Reading your answer")
        draft = await get_ai().structured(
            [
                {
                    "role": "system",
                    "content": prompts.FEEDBACK_SYSTEM.format(
                        language=LANGUAGE_NAME.get(kit.language, "English")
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"JOB\n{job_as_text(job, max_chars=2000)}\n\nQUESTION\n{question}\n"
                        "A strong answer covers:\n"
                        + "\n".join(f"- {point}" for point in strong)
                        + f"\n\nFACTS\n{facts}\n\nANSWER\n{answer}"
                    ),
                },
            ],
            FeedbackDraft,
            purpose="kits.interview_feedback",
            user_id=user.id,
            temperature=0.3,
            max_tokens=1800,
        )
        await stage("Checking the tighter version against what you said")
        feedback = check_feedback(draft, answer, own_words(document))
        better = await judge_answer(feedback.better_answer, [answer, *own_words(document)], user.id)
        attempt = PracticeAttempt(
            question_id=qid,
            answer=answer,
            words=word_count(answer),
            seconds=spoken_seconds(answer),
            feedback=feedback.model_copy(update={"better_answer": better}),
            created_at=utcnow(),
        )
        locked = await self._kit(user, kit_id, lock=True)
        practice: dict[str, Any] = dict((locked.extras or {}).get(PRACTICE_KEY) or {})
        locked.extras = {
            **(locked.extras or {}),
            PRACTICE_KEY: {**practice, qid: jsonable_encoder(attempt)},
        }
        await self.db.flush()
        return attempt
