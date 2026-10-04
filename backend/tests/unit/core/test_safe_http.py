"""Fetching user-supplied URLs must never reach private or internal addresses."""

from __future__ import annotations

import httpx
import pytest

from app.core import safe_http
from app.core.safe_http import BlockedUrlError, check_url, fetch_public, is_public

PUBLIC_IP = "93.184.216.34"


@pytest.fixture
def resolve(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[str]]:
    """Fake DNS: hostname -> addresses."""
    table: dict[str, list[str]] = {"jobs.example.com": [PUBLIC_IP]}

    async def fake(host: str, port: int) -> list[str]:
        return table.get(host, [])

    monkeypatch.setattr(safe_http, "_addresses", fake)
    return table


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",
        "10.1.2.3",
        "172.16.0.5",
        "192.168.1.1",
        "169.254.169.254",  # cloud metadata
        "100.64.0.1",  # carrier-grade NAT
        "0.0.0.0",
        "224.0.0.1",
        "::1",
        "fe80::1",
        "fd00::1",
        "::ffff:127.0.0.1",
        "::ffff:10.0.0.1",
    ],
)
def test_private_and_special_addresses_are_not_public(address: str) -> None:
    assert not is_public(address)


@pytest.mark.parametrize("address", [PUBLIC_IP, "8.8.8.8", "2606:4700:4700::1111"])
def test_public_addresses_are_public(address: str) -> None:
    assert is_public(address)


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://jobs.example.com/ad",
        "gopher://jobs.example.com/",
        "http://jobs.example.com:6379/",
        "https://jobs.example.com:8443/",
        "http://user:secret@jobs.example.com/",
        "http:///no-host",
        "not a url",
    ],
)
def test_unsupported_urls_are_refused(url: str) -> None:
    with pytest.raises(BlockedUrlError):
        check_url(url)


def test_standard_web_urls_pass() -> None:
    assert check_url("https://jobs.example.com/careers/123?ref=x").hostname == "jobs.example.com"
    assert check_url("http://jobs.example.com:80/a").hostname == "jobs.example.com"


async def test_host_resolving_to_a_private_address_is_refused(
    resolve: dict[str, list[str]],
) -> None:
    resolve["internal.example.com"] = ["10.0.0.7"]
    with pytest.raises(BlockedUrlError):
        await fetch_public("https://internal.example.com/job")


async def test_host_with_any_private_answer_is_refused(resolve: dict[str, list[str]]) -> None:
    resolve["mixed.example.com"] = [PUBLIC_IP, "127.0.0.1"]
    with pytest.raises(BlockedUrlError):
        await fetch_public("https://mixed.example.com/job")


async def test_literal_internal_ip_is_refused(resolve: dict[str, list[str]]) -> None:
    with pytest.raises(BlockedUrlError):
        await fetch_public("http://169.254.169.254/latest/meta-data/")


async def test_request_goes_to_the_checked_address(resolve: dict[str, list[str]]) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(
            200, text="<h1>Data Engineer</h1>", headers={"content-type": "text/html"}
        )

    page = await fetch_public(
        "https://jobs.example.com/job/1", transport=httpx.MockTransport(handler)
    )
    assert page.text == "<h1>Data Engineer</h1>"
    assert page.url == "https://jobs.example.com/job/1"
    assert seen[0].url.host == PUBLIC_IP
    assert seen[0].headers["host"] == "jobs.example.com"
    assert seen[0].extensions["sni_hostname"] == "jobs.example.com"


async def test_redirect_to_a_private_address_is_refused(resolve: dict[str, list[str]]) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"location": "http://127.0.0.1:80/admin"})

    with pytest.raises(BlockedUrlError):
        await fetch_public("https://jobs.example.com/job/1", transport=httpx.MockTransport(handler))


async def test_public_redirects_are_followed(resolve: dict[str, list[str]]) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/old":
            return httpx.Response(301, headers={"location": "/new"})
        return httpx.Response(200, text="moved here", headers={"content-type": "text/html"})

    page = await fetch_public(
        "https://jobs.example.com/old", transport=httpx.MockTransport(handler)
    )
    assert page.text == "moved here"
    assert page.url == "https://jobs.example.com/new"


async def test_redirect_loops_stop(resolve: dict[str, list[str]]) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"location": "/again"})

    with pytest.raises(safe_http.FetchError):
        await fetch_public("https://jobs.example.com/x", transport=httpx.MockTransport(handler))


async def test_huge_pages_are_cut_off(resolve: dict[str, list[str]]) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"a" * 5000, headers={"content-type": "text/html"})

    with pytest.raises(safe_http.FetchError):
        await fetch_public(
            "https://jobs.example.com/x", transport=httpx.MockTransport(handler), max_bytes=1000
        )


async def test_non_text_content_is_refused(resolve: dict[str, list[str]]) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"\x00\x01", headers={"content-type": "application/zip"})

    with pytest.raises(safe_http.FetchError):
        await fetch_public("https://jobs.example.com/x", transport=httpx.MockTransport(handler))
