"""Shared Pydantic bases for API contracts."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Schema(BaseModel):
    """Base for every request/response model. Reads ORM objects directly."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Page[T](Schema):
    """A page of results with an opaque cursor for the next page."""

    items: list[T]
    next_cursor: str | None = None
    total: int | None = None


class Ok(Schema):
    ok: bool = True
