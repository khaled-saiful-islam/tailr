from __future__ import annotations

import io
import json
import uuid

import httpx
import pytest
from PIL import Image
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.models import AiRun
from app.modules.auth.models import Role, User
from app.modules.auth.service import describe_device
from app.modules.profile.document import draft_to_document
from app.storage.files import LocalStorage
from tests.factories import sample_draft

PASSWORD = "correct-horse-1"


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (320, 200), (20, 90, 160)).save(buffer, format="PNG")
    return buffer.getvalue()


async def _me(client: httpx.AsyncClient) -> dict[str, str]:
    return (await client.get("/api/v1/auth/me")).json()  # type: ignore[no-any-return]


async def test_usage_shows_todays_ai_use(signed_in: httpx.AsyncClient, db: AsyncSession) -> None:
    me = await _me(signed_in)
    db.add(
        AiRun(
            user_id=uuid.UUID(me["id"]),
            purpose="kits.tailor",
            model="ilmu",
            prompt_tokens=1200,
            completion_tokens=300,
            status="ok",
        )
    )
    await db.commit()
    usage = (await signed_in.get("/api/v1/account/usage")).json()
    assert usage == {
        "ai_enabled": True,
        "tokens_today": 1500,
        "daily_budget": usage["daily_budget"],
        "calls_today": 1,
    }
    assert usage["daily_budget"] > 0


async def test_export_has_everything_but_secrets(signed_in: httpx.AsyncClient) -> None:
    document = draft_to_document(sample_draft()).model_dump(mode="json")
    await signed_in.put("/api/v1/profile", json={"document": document, "version": 0})
    await signed_in.put("/api/v1/momentum/goal", json={"weekly_applications": 4})
    response = await signed_in.get("/api/v1/account/export")
    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith('attachment; filename="tailr-export-')
    data = response.json()
    assert data["account"]["email"] == "aina@example.com"
    assert data["profile"][0]["document"]["basics"]["full_name"]
    assert data["goals"][0]["weekly_applications"] == 4
    text = json.dumps(data)
    assert "password_hash" not in text
    assert "token_hash" not in text


async def test_devices_and_signing_out_the_others(
    signed_in: httpx.AsyncClient, client: httpx.AsyncClient
) -> None:
    from app.main import create_app

    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as phone:
        login = await phone.post(
            "/api/v1/auth/login",
            json={"identifier": "aina@example.com", "password": PASSWORD},
            headers={"user-agent": "Mozilla/5.0 (iPhone) Version/17 Safari/604.1"},
        )
        assert login.status_code == 200
        devices = (await signed_in.get("/api/v1/auth/sessions")).json()
        assert len(devices) == 2
        assert [d["current"] for d in devices].count(True) == 1
        out = (await signed_in.post("/api/v1/auth/sessions/sign-out-others")).json()
        assert out == {"signed_out": 1}
        assert (await phone.get("/api/v1/auth/me")).status_code == 401
        assert (await signed_in.get("/api/v1/auth/me")).status_code == 200


@pytest.mark.parametrize(
    ("agent", "label"),
    [
        (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Chrome/129.0 Safari/537.36",
            "Chrome on macOS",
        ),
        ("Mozilla/5.0 (Windows NT 10.0) Chrome/129.0 Safari/537.36 Edg/129.0", "Edge on Windows"),
        ("Mozilla/5.0 (Linux; Android 14) Firefox/131.0", "Firefox on Android"),
        (None, "Unknown device"),
    ],
)
def test_device_names(agent: str | None, label: str) -> None:
    assert describe_device(agent) == label


async def test_deleting_the_account_removes_everything(
    signed_in: httpx.AsyncClient, storage: LocalStorage
) -> None:
    upload = await signed_in.post(
        "/api/v1/images",
        data={"purpose": "avatar"},
        files={"file": ("me.png", _png(), "image/png")},
    )
    assert upload.status_code == 201, upload.text
    files = list((storage.root).rglob("*.webp"))
    assert files

    wrong = await signed_in.request("DELETE", "/api/v1/account", json={"password": "nope"})
    assert wrong.status_code == 401
    assert wrong.json()["error"]["code"] == "bad_credentials"

    gone = await signed_in.request("DELETE", "/api/v1/account", json={"password": PASSWORD})
    assert gone.status_code == 200
    assert (await signed_in.get("/api/v1/auth/me")).status_code == 401
    assert not any(path.exists() for path in files)
    again = await signed_in.post(
        "/api/v1/auth/login", json={"identifier": "aina@example.com", "password": PASSWORD}
    )
    assert again.status_code == 401


async def test_the_last_admin_cannot_delete_themselves(
    signed_in: httpx.AsyncClient, db: AsyncSession
) -> None:
    await db.execute(update(User).values(role=Role.USER))  # only this user is an admin
    await db.execute(update(User).where(User.email == "aina@example.com").values(role=Role.ADMIN))
    await db.commit()
    response = await signed_in.request("DELETE", "/api/v1/account", json={"password": PASSWORD})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "last_admin"


async def test_the_shared_demo_account_is_locked(
    signed_in: httpx.AsyncClient, db: AsyncSession
) -> None:
    await db.execute(update(User).where(User.email == "aina@example.com").values(is_demo=True))
    await db.commit()
    attempts = [
        signed_in.request("DELETE", "/api/v1/account", json={"password": PASSWORD}),
        signed_in.post(
            "/api/v1/auth/password",
            json={"current_password": PASSWORD, "new_password": "another-horse-2"},
        ),
        signed_in.post("/api/v1/auth/sessions/sign-out-others"),
    ]
    for attempt in attempts:
        response = await attempt
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "demo_account"
    assert (await signed_in.get("/api/v1/auth/me")).status_code == 200


async def test_password_checks_are_rate_limited(signed_in: httpx.AsyncClient) -> None:
    for _ in range(5):
        wrong = await signed_in.request("DELETE", "/api/v1/account", json={"password": "nope"})
        assert wrong.status_code == 401
    blocked = await signed_in.request("DELETE", "/api/v1/account", json={"password": PASSWORD})
    assert blocked.status_code == 429
