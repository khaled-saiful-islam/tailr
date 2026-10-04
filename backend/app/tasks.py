"""Imports every module's tasks so the worker and scheduler register them."""

from __future__ import annotations

from app.modules.auth import tasks as auth_tasks  # noqa: F401
from app.modules.background import tasks as background_tasks  # noqa: F401
from app.modules.brief import tasks as brief_tasks  # noqa: F401
from app.modules.cv import tasks as cv_tasks  # noqa: F401
from app.modules.kits import tasks as kit_tasks  # noqa: F401
from app.modules.profile import tasks as profile_tasks  # noqa: F401
from app.modules.tracker import tasks as tracker_tasks  # noqa: F401
