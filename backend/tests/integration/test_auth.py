from __future__ import annotations

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import Role
from app.modules.auth.repository import UserRepository
from app.modules.auth.seed import ensure_admin

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"


async def test_register_signs_you_in(client: httpx.AsyncClient) -> None:
    response = await client.post(
        REGISTER,
        json={"name": " Aina ", "email": "Aina@Example.com", "password": "correct-horse-1"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "aina@example.com"
    assert body["name"] == "Aina"
    assert body["role"] == "user"
    assert body["onboarding_step"] == "import"
    assert "tailr_session" in response.cookies
    me = await client.get(ME)
    assert me.status_code == 200
    assert me.json()["email"] == "aina@example.com"


async def test_register_rejects_duplicate_email(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.post(
        REGISTER, json={"name": "Copy", "email": "AINA@example.com", "password": "another-pass-1"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"name": "A", "email": "not-an-email", "password": "long-enough-1"}, "email"),
        ({"name": "A", "email": "a@example.com", "password": "short"}, "password"),
        ({"name": "   ", "email": "a@example.com", "password": "long-enough-1"}, "name"),
    ],
)
async def test_register_validates_input(
    client: httpx.AsyncClient, payload: dict[str, str], field: str
) -> None:
    response = await client.post(REGISTER, json=payload)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert any(detail["field"] == field for detail in error["details"])


async def test_login_with_email_and_logout(signed_in: httpx.AsyncClient) -> None:
    await signed_in.post("/api/v1/auth/logout")
    signed_in.cookies.clear()
    assert (await signed_in.get(ME)).status_code == 401

    response = await signed_in.post(
        LOGIN, json={"identifier": "aina@example.com", "password": "correct-horse-1"}
    )
    assert response.status_code == 200
    assert (await signed_in.get(ME)).status_code == 200


async def test_login_wrong_password_is_vague(signed_in: httpx.AsyncClient) -> None:
    signed_in.cookies.clear()
    response = await signed_in.post(
        LOGIN, json={"identifier": "aina@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "bad_credentials"
    unknown = await signed_in.post(LOGIN, json={"identifier": "nobody", "password": "whatever"})
    assert unknown.json()["error"]["code"] == "bad_credentials"


async def test_login_is_rate_limited(client: httpx.AsyncClient) -> None:
    for _ in range(10):
        await client.post(LOGIN, json={"identifier": "x@example.com", "password": "nope"})
    response = await client.post(LOGIN, json={"identifier": "x@example.com", "password": "nope"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"


async def test_default_admin_signs_in_with_username(
    client: httpx.AsyncClient, db: AsyncSession
) -> None:
    await ensure_admin()
    await ensure_admin()  # idempotent
    admin = await UserRepository(db).get_by_identifier("admin")
    assert admin is not None
    assert admin.role == Role.ADMIN

    response = await client.post(LOGIN, json={"identifier": "ADMIN", "password": "admin"})
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


async def test_update_me(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.patch(
        ME, json={"name": "Aina R.", "timezone": "Asia/Singapore", "theme": "dark"}
    )
    assert response.status_code == 200
    assert response.json()["timezone"] == "Asia/Singapore"
    bad = await signed_in.patch(ME, json={"timezone": "Mars/Olympus"})
    assert bad.status_code == 422


async def test_palette_follows_the_account(signed_in: httpx.AsyncClient) -> None:
    assert (await signed_in.get(ME)).json()["palette"] == "tape"
    changed = await signed_in.patch(ME, json={"palette": "lagoon"})
    assert changed.status_code == 200
    assert changed.json()["palette"] == "lagoon"
    assert changed.json()["theme"] == "system"  # one doesn't reset the other
    assert (await signed_in.get(ME)).json()["palette"] == "lagoon"
    unknown = await signed_in.patch(ME, json={"palette": "neon"})
    assert unknown.status_code == 422


async def test_change_password(signed_in: httpx.AsyncClient) -> None:
    wrong = await signed_in.post(
        "/api/v1/auth/password",
        json={"current_password": "nope", "new_password": "brand-new-pass-2"},
    )
    assert wrong.status_code == 401
    ok = await signed_in.post(
        "/api/v1/auth/password",
        json={"current_password": "correct-horse-1", "new_password": "brand-new-pass-2"},
    )
    assert ok.status_code == 200
    assert (await signed_in.get(ME)).status_code == 200  # this device stays signed in
    signed_in.cookies.clear()
    login = await signed_in.post(
        LOGIN, json={"identifier": "aina@example.com", "password": "brand-new-pass-2"}
    )
    assert login.status_code == 200


async def test_writes_from_foreign_origin_are_blocked(client: httpx.AsyncClient) -> None:
    response = await client.post(
        LOGIN,
        json={"identifier": "a@example.com", "password": "x"},
        headers={"origin": "https://evil.example"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "bad_origin"


async def test_health(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": True, "redis": True}


async def test_session_is_null_for_visitors(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/auth/session")
    assert response.status_code == 200
    assert response.json() == {"user": None}


async def test_session_returns_signed_in_user(signed_in: httpx.AsyncClient) -> None:
    response = await signed_in.get("/api/v1/auth/session")
    assert response.json()["user"]["email"] == "aina@example.com"
