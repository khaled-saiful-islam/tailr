"""Image uploads: processed, owned, publicly readable by their unguessable URL."""

from __future__ import annotations

import io

import httpx
from PIL import Image


def _png(size: tuple[int, int] = (320, 200)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (20, 90, 160)).save(buffer, format="PNG")
    return buffer.getvalue()


async def _upload(
    client: httpx.AsyncClient, data: bytes, purpose: str = "project"
) -> httpx.Response:
    return await client.post(
        "/api/v1/images",
        files={"file": ("photo.png", data, "image/png")},
        data={"purpose": purpose},
    )


async def test_upload_and_serve(signed_in: httpx.AsyncClient) -> None:
    response = await _upload(signed_in, _png())
    assert response.status_code == 201, response.text
    image = response.json()
    assert image["width"] == 320
    assert image["height"] == 200
    assert image["url"] == f"/api/v1/images/{image['id']}.webp"

    signed_in.cookies.clear()  # anyone with the link can see it (it's for public pages)
    served = await signed_in.get(image["url"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/webp"
    assert "immutable" in served.headers["cache-control"]
    assert served.headers["x-content-type-options"] == "nosniff"
    assert served.content[:4] == b"RIFF"


async def test_avatar_is_square(signed_in: httpx.AsyncClient) -> None:
    image = (await _upload(signed_in, _png((900, 500)), purpose="avatar")).json()
    assert image["width"] == image["height"]


async def test_bad_uploads(signed_in: httpx.AsyncClient) -> None:
    not_image = await _upload(signed_in, b"<svg onload=alert(1)></svg>")
    assert not_image.status_code == 422
    assert not_image.json()["error"]["code"] == "not_an_image"

    huge = await _upload(signed_in, b"\x89PNG" + b"0" * (8 * 1024 * 1024 + 10))
    assert huge.status_code == 422
    assert huge.json()["error"]["code"] == "file_too_large"

    wrong_purpose = await _upload(signed_in, _png(), purpose="banner")
    assert wrong_purpose.status_code == 422


async def test_only_the_owner_can_delete(signed_in: httpx.AsyncClient) -> None:
    image = (await _upload(signed_in, _png())).json()
    signed_in.cookies.clear()
    await signed_in.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "other-pass-1"},
    )
    assert (await signed_in.delete(f"/api/v1/images/{image['id']}")).status_code == 404
    assert (await signed_in.get(image["url"])).status_code == 200


async def test_delete(signed_in: httpx.AsyncClient) -> None:
    image = (await _upload(signed_in, _png())).json()
    assert (await signed_in.delete(f"/api/v1/images/{image['id']}")).status_code == 204
    assert (await signed_in.get(image["url"])).status_code == 404


async def test_upload_needs_sign_in(client: httpx.AsyncClient) -> None:
    assert (await _upload(client, _png())).status_code == 401
