"""What other pages show about a job's place on the tracker.

Kept apart from `schemas.py` so the brief and kit schemas can use it without a cycle.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from app.core.schemas import Schema
from app.modules.tracker.models import Stage


class ApplicationRef(Schema):
    id: uuid.UUID
    stage: Stage
    applied_at: datetime | None
