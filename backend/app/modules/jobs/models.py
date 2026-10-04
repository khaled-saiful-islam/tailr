"""The job catalog: every listing Tailr has seen, shared by all users.

A job is fetched, read by the AI and embedded once, however many users it
matches. Per-user judgements (Fit %, status) live in `brief.models.Match`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, IdMixin
from app.modules.sources.base import WorkMode

EMBEDDING_DIMENSIONS = 1024


class Job(IdMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_jobs_source_external_id"),
        Index(
            "ix_jobs_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    source: Mapped[str] = mapped_column(String(32))
    external_id: Mapped[str] = mapped_column(String(64))
    url: Mapped[str] = mapped_column(String(500))
    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[str] = mapped_column(String(300))
    location: Mapped[str | None] = mapped_column(String(300))
    work_mode: Mapped[WorkMode | None] = mapped_column(String(16))
    employment_type: Mapped[str | None] = mapped_column(String(32))
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    posted_text: Mapped[str | None] = mapped_column(String(64))
    salary_text: Mapped[str | None] = mapped_column(String(200))
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    snippet: Mapped[str | None] = mapped_column(Text)
    company_logo: Mapped[str | None] = mapped_column(String(600))
    # Same company + same title, normalised: finds the same job on two sites.
    fingerprint: Mapped[str] = mapped_column(String(600), index=True)

    # Full description, fetched once.
    description_text: Mapped[str | None] = mapped_column(Text)
    detail_status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|ok|failed
    detail_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    applicants: Mapped[str | None] = mapped_column(String(64))
    industries: Mapped[str | None] = mapped_column(String(300))
    source_seniority: Mapped[str | None] = mapped_column(String(64))

    # What the AI read from the description (`JobInsights`), and the job's vector.
    insights: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    insights_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS))

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    @property
    def text_for_reading(self) -> str:
        """The best text we have about the job, for the AI and for embeddings."""
        return self.description_text or self.snippet or ""
