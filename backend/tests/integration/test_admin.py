from __future__ import annotations

import uuid

import httpx
import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import enforce_daily_budget, release, reserve
from app.ai.models import AiRun
from app.core.errors import PermissionDeniedError, RateLimitedError
from app.modules.auth.models import Role, User
from app.modules.sources.models import SourceRun

PASSWORD = "correct-horse-1"


async def _register(client: httpx.AsyncClient, name: str, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register", json={"name": name, "email": email, "password": PASSWORD}
    )
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


@pytest.fixture
async def admin(client: httpx.AsyncClient, db: AsyncSession) -> httpx.AsyncClient:
    """Two accounts: Farah (a user) and Aina, signed in, made an admin."""
    await _register(client, "Farah Lim", "farah@example.com")
    await client.post("/api/v1/auth/logout")
    await _register(client, "Aina Rahman", "aina@example.com")
    await db.execute(update(User).where(User.email == "aina@example.com").values(role=Role.ADMIN))
    await db.commit()
    return client


async def _farah(admin: httpx.AsyncClient) -> dict[str, object]:
    page = (await admin.get("/api/v1/admin/users", params={"q": "farah"})).json()
    [farah] = page["items"]
    return farah  # type: ignore[no-any-return]


async def test_only_admins_get_in(signed_in: httpx.AsyncClient) -> None:
    for path in ("/api/v1/admin/overview", "/api/v1/admin/users"):
        response = await signed_in.get(path)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "admin_only"


async def test_overview_and_users(admin: httpx.AsyncClient, db: AsyncSession) -> None:
    farah = await _farah(admin)
    db.add(
        AiRun(
            user_id=uuid.UUID(str(farah["id"])),
            purpose="kits.tailor",
            model="ilmu",
            prompt_tokens=900,
            completion_tokens=100,
            status="ok",
        )
    )
    db.add(SourceRun(source="linkedin", kind="search", query="ai", status="ok", results=0))
    db.add(SourceRun(source="linkedin", kind="search", query="ml", status="failed", error="403"))
    await db.commit()

    overview = (await admin.get("/api/v1/admin/overview")).json()
    assert overview["users"] >= 2
    assert overview["tokens_24h"] == 1000
    assert overview["purposes_30d"][0] == {"purpose": "kits.tailor", "tokens": 1000, "calls": 1}
    assert len(overview["days"]) == 14
    [linkedin] = overview["sources"]
    assert (linkedin["runs"], linkedin["failed"], linkedin["empty"]) == (2, 1, 1)
    assert linkedin["last_error"] == "403"

    users = (await admin.get("/api/v1/admin/users")).json()
    assert users["total"] >= 2
    farah = await _farah(admin)
    assert farah["tokens_24h"] == 1000
    detail = (await admin.get(f"/api/v1/admin/users/{farah['id']}")).json()
    assert detail["calls_30d"] == 1
    assert detail["purposes_30d"][0]["purpose"] == "kits.tailor"
    admins = (await admin.get("/api/v1/admin/users", params={"status": "admins"})).json()
    assert [u["email"] for u in admins["items"]] == ["aina@example.com"]


async def test_ai_switch_and_budget(admin: httpx.AsyncClient, db: AsyncSession) -> None:
    farah = await _farah(admin)
    user_id = uuid.UUID(str(farah["id"]))
    url = f"/api/v1/admin/users/{farah['id']}"

    off = (await admin.patch(url, json={"ai_enabled": False})).json()
    assert off["ai_enabled"] is False
    with pytest.raises(PermissionDeniedError) as blocked:
        await enforce_daily_budget(user_id)
    assert blocked.value.code == "ai_disabled"

    await admin.patch(url, json={"ai_enabled": True, "ai_daily_budget": 500})
    db.add(
        AiRun(
            user_id=user_id,
            purpose="cv.improve",
            model="ilmu",
            prompt_tokens=400,
            completion_tokens=200,
            status="ok",
        )
    )
    await db.commit()
    with pytest.raises(RateLimitedError):
        await enforce_daily_budget(user_id)

    back = (await admin.patch(url, json={"ai_daily_budget": None})).json()
    assert back["ai_daily_budget"] is None
    await enforce_daily_budget(user_id)  # the default allowance is far higher


async def test_disabling_signs_them_out(admin: httpx.AsyncClient) -> None:
    from app.main import create_app

    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as theirs:
        login = await theirs.post(
            "/api/v1/auth/login", json={"identifier": "farah@example.com", "password": PASSWORD}
        )
        assert login.status_code == 200
        farah = await _farah(admin)
        url = f"/api/v1/admin/users/{farah['id']}"
        disabled = (await admin.patch(url, json={"is_active": False})).json()
        assert disabled["is_active"] is False
        assert disabled["signed_in_devices"] == 0
        assert (await theirs.get("/api/v1/auth/me")).status_code == 401
        refused = await theirs.post(
            "/api/v1/auth/login", json={"identifier": "farah@example.com", "password": PASSWORD}
        )
        assert refused.status_code == 401

        await admin.patch(url, json={"is_active": True, "role": "admin"})
        welcome = await theirs.post(
            "/api/v1/auth/login", json={"identifier": "farah@example.com", "password": PASSWORD}
        )
        assert welcome.status_code == 200
        assert welcome.json()["role"] == "admin"


@pytest.mark.parametrize("change", [{"is_active": False}, {"ai_enabled": False}, {"role": "user"}])
async def test_admins_cannot_lock_themselves_out(
    admin: httpx.AsyncClient, change: dict[str, object]
) -> None:
    me = (await admin.get("/api/v1/auth/me")).json()
    response = await admin.patch(f"/api/v1/admin/users/{me['id']}", json=change)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "own_account"


async def test_the_demo_account_cannot_be_made_an_admin(
    admin: httpx.AsyncClient, db: AsyncSession
) -> None:
    await db.execute(update(User).where(User.email == "farah@example.com").values(is_demo=True))
    await db.commit()
    farah = await _farah(admin)
    response = await admin.patch(f"/api/v1/admin/users/{farah['id']}", json={"role": "admin"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "demo_account"


async def test_calls_in_flight_hold_their_share_of_the_allowance(admin: httpx.AsyncClient) -> None:
    farah = await _farah(admin)
    user_id = uuid.UUID(str(farah["id"]))
    await admin.patch(f"/api/v1/admin/users/{farah['id']}", json={"ai_daily_budget": 1000})
    first = await reserve(user_id, 600)
    with pytest.raises(RateLimitedError):
        await reserve(user_id, 600)  # two at once would overshoot
    await release(user_id, first)
    await release(user_id, await reserve(user_id, 600))  # room again once the first is done
