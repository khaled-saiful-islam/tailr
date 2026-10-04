"""Which job sources exist and which are switched on.

`SOURCES_ENABLED` in .env is the kill switch: remove a key and that source is
skipped everywhere (search, preview, briefs) without a code change.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.modules.sources.base import JobSource
from app.modules.sources.jobstreet import JobStreetSource
from app.modules.sources.linkedin import LinkedInSource


@dataclass(frozen=True)
class SourceInfo:
    key: str
    label: str
    available: bool
    note: str | None = None


_SERVER_SOURCES: dict[str, JobSource] = {
    "linkedin": LinkedInSource(),
    "jobstreet": JobStreetSource(),
}

# Sources that need Tailr Desktop on the user's computer (their sites block servers).
_DESKTOP_SOURCES = {"indeed": "Indeed", "glassdoor": "Glassdoor"}

_overrides: dict[str, JobSource] = {}


def enabled_keys() -> list[str]:
    allowed = set(get_settings().sources_enabled)
    return [key for key in _SERVER_SOURCES if key in allowed]


def get_source(key: str) -> JobSource | None:
    if key not in enabled_keys():
        return None
    return _overrides.get(key) or _SERVER_SOURCES[key]


def catalog() -> list[SourceInfo]:
    enabled = set(enabled_keys())
    infos = [
        SourceInfo(
            key,
            source.label,
            key in enabled,
            None if key in enabled else "Switched off by the administrator",
        )
        for key, source in _SERVER_SOURCES.items()
    ]
    infos += [
        SourceInfo(key, label, False, "Needs Tailr Desktop, coming soon")
        for key, label in _DESKTOP_SOURCES.items()
    ]
    return infos


def label_for(key: str) -> str:
    source = _SERVER_SOURCES.get(key)
    return source.label if source else _DESKTOP_SOURCES.get(key, key.title())


def override(key: str, source: JobSource | None) -> None:
    """Replace a source (tests use fakes)."""
    if source is None:
        _overrides.pop(key, None)
    else:
        _overrides[key] = source
