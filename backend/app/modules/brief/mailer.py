"""Email the morning brief, when the user wants it and there's something to say."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.db import session_scope
from app.modules.auth.models import User
from app.modules.brief.models import Brief, Match
from app.modules.jobs.models import Job
from app.modules.notifications.email import render, send_email
from app.modules.radar.service import RadarService

TOP = 5


def _place(location: str | None) -> str | None:
    return location.split(",")[0].strip() if location else None


async def email_brief(brief_id: uuid.UUID) -> bool:
    async with session_scope() as db:
        brief = await db.get(Brief, brief_id)
        if brief is None or brief.emailed_at is not None:
            return False
        user = await db.get(User, brief.user_id)
        radar = await RadarService(db).settings_for(brief.user_id)
        if user is None or radar is None or not radar.email_brief or not user.email_digest:
            return False
        rows = (
            await db.execute(
                select(Match, Job)
                .join(Job, Job.id == Match.job_id)
                .where(Match.brief_id == brief_id)
                .order_by(Match.score.desc())
                .limit(TOP)
            )
        ).all()
        count = len(
            (await db.execute(select(Match.id).where(Match.brief_id == brief_id))).scalars().all()
        )
        good = sum(1 for match, _ in rows if match.score >= radar.min_fit)
        if not rows:
            return False
        first_name = user.name.split(" ")[0]
        email, date_label = user.email, brief.local_date.strftime("%A, %d %B").replace(" 0", " ")
        items = [
            {
                "title": job.title,
                "company": job.company,
                "place": _place(job.location),
                "score": match.score,
                "headline": (match.review or {}).get("headline"),
            }
            for match, job in rows
        ]

    jobs = "1 new job" if count == 1 else f"{count} new jobs"
    subject = f"{jobs} for you this morning"
    intro = (
        f"Tailr found {jobs} for you today. Here are the best matches."
        if good
        else f"Tailr found {jobs} for you today, none a strong match yet. Here are the closest."
    )
    app_url = get_settings().public_web_url
    context: dict[str, object] = {
        "subject": subject,
        "date_label": date_label,
        "headline": f"Good morning, {first_name}.",
        "intro": intro,
        "matches": items,
        "app_url": app_url,
    }
    lines = [intro, ""]
    lines += [f"{item['score']}%  {item['title']}, {item['company']}" for item in items]
    lines += ["", f"See all your jobs: {app_url}/jobs"]
    text = "\n".join(lines)
    sent = await send_email(
        to=email, subject=subject, html=render("brief.html", **context), text=text
    )
    if sent:
        async with session_scope() as db:
            brief = await db.get(Brief, brief_id)
            if brief is not None:
                brief.emailed_at = utcnow()
    return sent
