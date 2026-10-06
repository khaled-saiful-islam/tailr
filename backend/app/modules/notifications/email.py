"""Outgoing email. SMTP (Mailpit in development, a provider over TLS in production),
templates rendered with Jinja2.

Sending is best-effort: a failed email is logged, never raised into the work
that triggered it.
"""

from __future__ import annotations

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

_templates = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "templates"),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render(template: str, **context: Any) -> str:
    return _templates.get_template(template).render(**context)


def _connect(settings: Settings) -> smtplib.SMTP:
    if settings.smtp_security == "ssl":
        return smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=15,
            context=ssl.create_default_context(),
        )
    return smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)


def _send(message: EmailMessage) -> None:
    settings = get_settings()
    with _connect(settings) as smtp:
        if settings.smtp_security == "starttls":
            smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


async def send_email(
    *, to: str, subject: str, html: str, text: str, reply_to: str | None = None
) -> bool:
    settings = get_settings()
    if not settings.email_enabled:
        return False
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    try:
        await asyncio.to_thread(_send, message)
    except (OSError, smtplib.SMTPException) as error:
        log.warning("email_failed", subject=subject, error=str(error)[:200])
        return False
    return True
