"""Application settings, read once from the environment.

Every tunable lives here so the rest of the code asks `get_settings()` instead of
reading `os.environ`. Defaults are safe for local development; production must
override the secrets (see `validate_for_production`).
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


_DEV_SECRET = "dev-only-secret-change-me"  # noqa: S105 - placeholder, refused in production


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # App
    app_name: str = "Tailr"
    app_env: Environment = Environment.DEVELOPMENT
    log_level: str = "INFO"
    secret_key: str = _DEV_SECRET
    public_web_url: str = "http://localhost:8400"
    # The built public-page shell (frontend/public.html). Public profile pages are this
    # file with the profile's link-preview tags and data filled in.
    web_shell_url: str = "http://frontend/public.html"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:8400", "http://localhost:8403"]
    )

    # Infrastructure
    database_url: str = "postgresql+asyncpg://tailr:tailr@localhost:8402/tailr"
    redis_url: str = "redis://localhost:8404/0"
    renderer_url: str = "http://localhost:8406"
    storage_dir: str = "/srv/data/files"

    # Sessions
    session_cookie_name: str = "tailr_session"
    session_ttl_days: int = 30
    cookie_secure: bool = False

    # AI (ILMU, OpenAI-compatible)
    llm_base_url: str = "https://api.ilmu.ai/v1"
    llm_api_key: str = ""
    llm_model: str = "ilmu-v3.1"
    llm_fast_model: str = "ilmu-mini-v3.3"
    llm_vision_model: str = "ilmu-vision-v1.3"
    embedding_model: str = "bge-m3"
    embedding_dimensions: int = 1024
    rerank_model: str = "bge-reranker"
    llm_timeout_seconds: float = 120.0
    llm_max_concurrency: int = 6
    ai_daily_budget_tokens: int = 1_500_000

    # Default admin, created on first start (change the password before going live)
    seed_admin_username: str = "admin"
    seed_admin_password: str = "admin"  # noqa: S105 - documented dev default, refused in production
    seed_admin_email: str = "admin@tailr.local"

    # Uploads
    upload_max_mb: int = 10

    # Job sources
    sources_enabled: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["linkedin", "jobstreet"]
    )
    source_search_cache_seconds: int = 3600
    source_requests_per_minute: int = 20
    source_user_agent: str = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    )
    brief_max_queries: int = 4
    brief_max_new_details: int = 40
    brief_candidate_pool: int = 60
    brief_rerank_keep: int = 25
    brief_explain_top: int = 15

    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "Tailr <brief@tailr.local>"
    email_enabled: bool = True

    @field_validator("cors_origins", "sources_enabled", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION

    @property
    def upload_max_bytes(self) -> int:
        return self.upload_max_mb * 1024 * 1024

    def validate_for_production(self) -> None:
        """Refuse to boot production with development secrets."""
        if not self.is_production:
            return
        problems = []
        if self.secret_key == _DEV_SECRET or len(self.secret_key) < 32:
            problems.append("SECRET_KEY must be a random string of 32+ characters")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true behind HTTPS")
        if self.seed_admin_password == "admin":  # noqa: S105
            problems.append("SEED_ADMIN_PASSWORD must not be the default 'admin'")
        if not self.llm_api_key:
            problems.append("LLM_API_KEY is required")
        if problems:
            raise RuntimeError("Unsafe production config: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()
