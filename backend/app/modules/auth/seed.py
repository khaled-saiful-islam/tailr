"""Creates the default admin account. Safe to run on every start."""

from __future__ import annotations

from app.core.config import get_settings
from app.core.db import session_scope
from app.core.logging import get_logger
from app.core.security import hash_password
from app.modules.auth.models import OnboardingStep, Role, User
from app.modules.auth.repository import UserRepository

log = get_logger(__name__)


async def ensure_admin() -> None:
    settings = get_settings()
    username = settings.seed_admin_username.strip().lower()
    if not username:
        return
    async with session_scope() as db:
        users = UserRepository(db)
        if await users.get_by_identifier(username):
            return
        await users.add(
            User(
                email=settings.seed_admin_email.lower(),
                username=username,
                name="Admin",
                role=Role.ADMIN,
                password_hash=hash_password(settings.seed_admin_password),
                onboarding_step=OnboardingStep.IMPORT,
            )
        )
    log.info("admin_created", username=username)
