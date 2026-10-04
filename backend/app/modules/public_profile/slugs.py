"""Page addresses: tailr.app/p/<slug>."""

from __future__ import annotations

import re
import unicodedata

SLUG = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$")
RESERVED = frozenset(
    {
        "admin", "api", "app", "assets", "auth", "billing", "blog", "dashboard", "help",
        "home", "images", "jobs", "kits", "login", "logout", "me", "media", "new", "null",
        "og", "p", "privacy", "profile", "public", "radar", "register", "root", "settings",
        "sign-in", "sign-up", "signin", "signup", "static", "support", "tailr", "team",
        "terms", "test", "undefined", "user", "users", "www",
    }
)  # fmt: skip


def normalise(value: str) -> str:
    return value.strip().lower()


def slug_problem(slug: str) -> str | None:
    """Why a slug can't be used, in words a person understands; None if it's fine."""
    if not SLUG.match(slug):
        return (
            "Use 3 to 40 lowercase letters, numbers or hyphens, starting and ending "
            "with a letter or number."
        )
    if "--" in slug:
        return "Use single hyphens between words."
    if slug in RESERVED:
        return "That address is reserved. Try another."
    return None


def slugify(name: str) -> str:
    """'Nur Aina Rahman' → 'nur-aina-rahman'; accents dropped, at most 40 characters."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")[:40].strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug if len(slug) >= 3 and slug not in RESERVED else f"{slug or 'me'}-profile"[:40]
