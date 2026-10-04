"""The portfolio's contact form: messages reach the owner without exposing their email.

Spam defences without a third-party captcha: a hidden field bots fill in, a signed
time stamp (too fast or too old means a bot), rate limits per sender and per page,
and flags for messages full of links or sent twice. Bots get the same "sent" answer
as people, so they learn nothing. No automatic reply is sent to the address typed,
so the form can't be used to email strangers.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.clock import utcnow
from app.core.config import get_settings
from app.core.logging import get_logger
from app.modules.auth.models import User
from app.modules.notifications.email import render, send_email
from app.modules.notifications.service import notify
from app.modules.public_profile.models import PortfolioMessage, PublicProfile
from app.modules.public_profile.schemas import MessageIn

log = get_logger(__name__)

MIN_SECONDS = 3
MAX_SECONDS = 24 * 3600
_LINK = re.compile(r"https?://|www\.", re.I)
REASONS = {"job": "A job opportunity", "freelance": "Freelance work", "hello": "Just saying hi"}


def _sign(slug: str, stamp: int) -> str:
    key = get_settings().secret_key.encode()
    return hmac.new(key, f"contact|{slug}|{stamp}".encode(), hashlib.sha256).hexdigest()[:24]


def form_token(slug: str, now: datetime | None = None) -> str:
    stamp = int((now or utcnow()).timestamp())
    return f"{stamp}.{_sign(slug, stamp)}"


def token_ok(slug: str, token: str, now: datetime | None = None) -> bool:
    stamp_text, _, signature = token.partition(".")
    if not stamp_text.isdigit() or not hmac.compare_digest(_sign(slug, int(stamp_text)), signature):
        return False
    age = (now or utcnow()).timestamp() - int(stamp_text)
    return MIN_SECONDS <= age <= MAX_SECONDS


def sender_hash(ip: str) -> str:
    salt = get_settings().secret_key
    return hashlib.sha256(f"{salt}|sender|{ip}".encode()).hexdigest()


async def receive(db: AsyncSession, row: PublicProfile, data: MessageIn, ip: str) -> bool:
    """Store and deliver a message. Returns whether it was a real one (bots get no hint)."""
    if data.website or not token_ok(row.slug, data.token):
        log.info("contact_form_bot", profile=str(row.id))
        return False
    sender = sender_hash(ip)
    message_text = "Too many messages. Try again later."
    await rate_limit.enforce(
        f"contact-form:{sender}:10m", limit=3, window_seconds=600, message=message_text
    )
    await rate_limit.enforce(
        f"contact-form:{sender}:day", limit=10, window_seconds=86400, message=message_text
    )
    await rate_limit.enforce(
        f"contact-form-page:{row.id}", limit=50, window_seconds=86400, message=message_text
    )
    repeated = await db.scalar(
        select(func.count())
        .select_from(PortfolioMessage)
        .where(
            PortfolioMessage.profile_id == row.id,
            PortfolioMessage.message == data.message,
            PortfolioMessage.created_at >= utcnow() - timedelta(days=1),
        )
    )
    flagged = len(_LINK.findall(data.message)) > 2 or bool(repeated)
    db.add(
        PortfolioMessage(
            profile_id=row.id,
            name=data.name,
            email=str(data.email),
            reason=data.reason,
            company=data.company,
            message=data.message,
            flagged=flagged,
            sender_hash=sender,
            created_at=utcnow(),
        )
    )
    await db.flush()
    owner = await db.get(User, row.user_id)
    if owner is not None and not flagged:
        await _deliver(owner, data)
    return True


async def _deliver(owner: User, data: MessageIn) -> None:
    reason = REASONS.get(data.reason, data.reason)
    who = f"{data.name}{f' ({data.company})' if data.company else ''}"
    inbox = f"{get_settings().public_web_url.rstrip('/')}/profile/portfolio"
    await send_email(
        to=owner.email,
        subject=f"{data.name} sent you a message on Tailr",
        html=render("portfolio_message.html", who=who, reason=reason, data=data, inbox=inbox),
        text=(
            f"{who} wrote to you through your Tailr portfolio.\n"
            f"About: {reason}\nEmail: {data.email}\n\n{data.message}\n\n"
            f"Reply to this email to answer them. Your inbox: {inbox}"
        ),
        reply_to=str(data.email),
    )
    await notify(
        owner.id,
        kind="message.new",
        title=f"New message from {data.name}",
        body=data.message[:140],
        link="/profile/website",
    )
