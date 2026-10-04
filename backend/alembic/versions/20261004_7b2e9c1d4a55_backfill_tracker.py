"""backfill tracker: saved jobs and built kits from before the tracker

Revision ID: 7b2e9c1d4a55
Revises: 3f6d5c4b17a3
Create Date: 2026-10-04 12:30:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "7b2e9c1d4a55"
down_revision: str | None = "3f6d5c4b17a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A job with a kit is being prepared; a saved job without one is saved. Newer on top.
    op.execute(
        """
        INSERT INTO applications (
            id, user_id, job_id, match_id, kit_id, stage, position, furthest,
            stage_changed_at, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), m.user_id, m.job_id, m.id, k.id,
            CASE WHEN k.id IS NULL THEN 'saved' ELSE 'preparing' END,
            -extract(epoch FROM coalesce(k.created_at, m.status_changed_at, m.created_at)),
            CASE WHEN k.id IS NULL THEN 0 ELSE 1 END,
            coalesce(k.created_at, m.status_changed_at, m.created_at), now(), now()
        FROM matches m
        LEFT JOIN kits k ON k.user_id = m.user_id AND k.job_id = m.job_id
        WHERE m.status = 'saved' OR k.id IS NOT NULL
        ON CONFLICT ON CONSTRAINT uq_applications_user_job DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO application_events (id, application_id, kind, stage, detail, at)
        SELECT gen_random_uuid(), a.id, 'added', a.stage, '{}'::jsonb, a.stage_changed_at
        FROM applications a
        WHERE NOT EXISTS (SELECT 1 FROM application_events e WHERE e.application_id = a.id)
        """
    )


def downgrade() -> None:
    # The rows are ordinary tracker data now; the table drop in the previous step removes them.
    pass
