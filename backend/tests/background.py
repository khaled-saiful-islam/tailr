"""Helpers for endpoints that start background tasks. In tests the task runs before the
response returns, so a response already carries the finished task."""

from __future__ import annotations

from typing import Any

import httpx


def done(response: httpx.Response) -> Any:
    """The result of a task that finished well."""
    assert response.status_code == 202, response.text
    task = response.json()
    assert task["status"] == "done", task
    return task["result"]


def failed(response: httpx.Response) -> str:
    """The message of a task that failed."""
    assert response.status_code == 202, response.text
    task = response.json()
    assert task["status"] == "failed", task
    return str(task["error"])
