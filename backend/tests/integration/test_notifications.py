"""In-app notifications: saved, listed newest first, marked read, private to their owner."""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.notifications.service import KEEP_PER_USER, notify


async def _me(db: AsyncSession) -> uuid.UUID:
    user = (await db.execute(select(User).where(User.email == "aina@example.com"))).scalar_one()
    return user.id


async def test_notifications_list_and_read(signed_in: httpx.AsyncClient, db: AsyncSession) -> None:
    user_id = await _me(db)
    await notify(user_id, kind="kit.ready", title="First", body="Body one", link="/kits/1")
    await notify(user_id, kind="brief.ready", title="Second", link="/")

    page = (await signed_in.get("/api/v1/notifications")).json()
    assert page["unread"] == 2
    assert [n["title"] for n in page["items"]] == ["Second", "First"]
    assert page["items"][1] | {"id": None, "created_at": None} == {
        "id": None,
        "kind": "kit.ready",
        "title": "First",
        "body": "Body one",
        "link": "/kits/1",
        "read": False,
        "created_at": None,
    }

    first = page["items"][1]["id"]
    assert (await signed_in.post(f"/api/v1/notifications/{first}/read")).status_code == 204
    page = (await signed_in.get("/api/v1/notifications")).json()
    assert page["unread"] == 1
    assert page["items"][1]["read"] is True

    assert (await signed_in.post("/api/v1/notifications/read-all")).status_code == 204
    assert (await signed_in.get("/api/v1/notifications")).json()["unread"] == 0


async def test_old_notifications_are_pruned(signed_in: httpx.AsyncClient, db: AsyncSession) -> None:
    user_id = await _me(db)
    for index in range(KEEP_PER_USER + 3):
        await notify(user_id, kind="brief.ready", title=f"N{index}")
    page = (await signed_in.get("/api/v1/notifications?limit=200")).json()
    assert len(page["items"]) == KEEP_PER_USER


async def test_notifications_are_private(signed_in: httpx.AsyncClient, db: AsyncSession) -> None:
    await notify(await _me(db), kind="kit.ready", title="Mine")
    mine = (await signed_in.get("/api/v1/notifications")).json()["items"][0]["id"]
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    assert (await signed_in.get("/api/v1/notifications")).json() == {"items": [], "unread": 0}
    assert (await signed_in.post(f"/api/v1/notifications/{mine}/read")).status_code == 404


async def test_signed_out_gets_401(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/notifications")).status_code == 401
