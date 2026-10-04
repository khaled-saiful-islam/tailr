"""Small text helpers shared by the source parsers."""

from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from selectolax.lexbor import LexborHTMLParser

_RELATIVE = re.compile(r"(\d+)\s*(minute|min|m|hour|hr|h|day|d|week|wk|w|month|mo)s?\b", re.I)
_UNITS = {
    "minute": timedelta(minutes=1),
    "min": timedelta(minutes=1),
    "m": timedelta(minutes=1),
    "hour": timedelta(hours=1),
    "hr": timedelta(hours=1),
    "h": timedelta(hours=1),
    "day": timedelta(days=1),
    "d": timedelta(days=1),
    "week": timedelta(weeks=1),
    "wk": timedelta(weeks=1),
    "w": timedelta(weeks=1),
    "month": timedelta(days=30),
    "mo": timedelta(days=30),
}


def clean(text: str | None) -> str | None:
    if text is None:
        return None
    value = re.sub(r"\s+", " ", html.unescape(text)).strip()
    return value or None


def parse_relative(text: str | None, now: datetime) -> datetime | None:
    """'3 hours ago', '19h ago', '2 weeks ago', 'Just now' → a moment before `now`."""
    if not text:
        return None
    lowered = text.lower()
    if "just now" in lowered or "moment" in lowered:
        return now
    match = _RELATIVE.search(lowered)
    if not match:
        return None
    unit = _UNITS.get(match.group(2).lower())
    return now - int(match.group(1)) * unit if unit else None


def html_to_text(markup: str | None) -> str:
    """Readable plain text from job-description HTML: paragraphs and bullets kept."""
    if not markup:
        return ""
    tree = LexborHTMLParser(f"<div id='root'>{markup}</div>")
    root = tree.css_first("#root")
    if root is None:
        return ""
    for node in root.css("br"):
        node.replace_with("\n")
    for node in root.css("li"):
        node.insert_before("\n• ")
    for node in root.css("p, div, h1, h2, h3, h4, ul, ol"):
        node.insert_after("\n")
    text = root.text(separator="")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
