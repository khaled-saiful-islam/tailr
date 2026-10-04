"""Imports every module's tasks so the worker and scheduler register them."""

from __future__ import annotations

from app.modules.auth import tasks as auth_tasks  # noqa: F401
