"""What never leaves the profile: phone numbers, street addresses, unsafe links."""

from __future__ import annotations

import re
from urllib.parse import urlsplit

_STREET = re.compile(
    r"\b(jalan|jln|lorong|lrg|persiaran|lebuh|street|st\.?|road|rd\.?|avenue|ave\.?|lot|no\.?|"
    r"unit|blok|block|level|floor|taman)\b",
    re.I,
)
_DIGITS = re.compile(r"\d")


def safe_location(location: str | None) -> str | None:
    """City and region only.

    'No 12, Jalan Ampang, 50450 Kuala Lumpur, Malaysia' → 'Kuala Lumpur, Malaysia'.
    """
    if not location:
        return None
    parts = []
    for raw in location.split(","):
        part = re.sub(r"\b\d{4,6}\b", "", raw).strip()  # postcodes
        if not part or _STREET.search(part) or _DIGITS.search(part):
            continue
        parts.append(part)
    return ", ".join(parts[-2:]) or None


def safe_url(url: str | None) -> str | None:
    """Only plain web links are shown; anything else (javascript:, data:, ...) is dropped."""
    if not url:
        return None
    candidate = url.strip()
    if "://" not in candidate and re.match(r"^[\w.-]+\.[a-z]{2,}(/|$)", candidate, re.I):
        candidate = f"https://{candidate}"
    parts = urlsplit(candidate)
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        return None
    return candidate
