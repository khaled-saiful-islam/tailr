"""user palette

Revision ID: 5c1e8a7f3b20
Revises: 7ea7bc3dd486
Create Date: 2026-10-05 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '5c1e8a7f3b20'
down_revision: str | None = '7ea7bc3dd486'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('palette', sa.String(length=16), server_default='tape', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('users', 'palette')
