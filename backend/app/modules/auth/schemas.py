from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.core.clock import is_valid_timezone
from app.core.schemas import Schema
from app.core.security import MIN_PASSWORD_LENGTH
from app.modules.auth.models import OnboardingStep, Role, Theme


class RegisterRequest(Schema):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=200)
    timezone: str | None = None

    @field_validator("name")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Please tell us your name.")
        return value


class LoginRequest(Schema):
    identifier: str = Field(min_length=1, max_length=320, description="Email or username")
    password: str = Field(min_length=1, max_length=200)


class UserOut(Schema):
    id: uuid.UUID
    email: str
    username: str | None
    role: Role
    name: str
    timezone: str
    theme: Theme
    onboarding_step: OnboardingStep
    email_digest: bool
    is_demo: bool
    created_at: datetime


class DeviceOut(Schema):
    """A place you're signed in."""

    id: uuid.UUID
    device: str
    ip_address: str | None
    created_at: datetime
    last_used_at: datetime
    current: bool


class SignedOutOut(Schema):
    signed_out: int


class SessionOut(Schema):
    """Who is signed in. `user` is null for visitors (a normal state, not an error)."""

    user: UserOut | None


class UpdateMeRequest(Schema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    timezone: str | None = None
    theme: Theme | None = None
    email_digest: bool | None = None
    onboarding_step: OnboardingStep | None = None

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, value: str | None) -> str | None:
        if value is not None and not is_valid_timezone(value):
            raise ValueError("Unknown time zone.")
        return value


class ChangePasswordRequest(Schema):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=200)
