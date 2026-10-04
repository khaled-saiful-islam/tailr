from __future__ import annotations

import uuid

from app.modules.kits.builder import run_kit
from app.worker import broker


@broker.task(task_name="kits.build")
async def build_kit(kit_id: str) -> None:
    """Tailor the resume, write the letter, prepare the extras and check every line."""
    await run_kit(uuid.UUID(kit_id))
