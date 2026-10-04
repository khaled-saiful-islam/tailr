from __future__ import annotations

import uuid

from app.modules.profile.importer import run_import
from app.worker import broker


@broker.task(task_name="profile.process_import")
async def process_import(import_id: str) -> None:
    """Read an uploaded CV and turn it into a profile draft."""
    await run_import(uuid.UUID(import_id))
