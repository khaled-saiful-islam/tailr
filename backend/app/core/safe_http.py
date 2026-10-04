"""Fetch a page from a URL a user gave us, without letting it reach inside our network.

Every hop, redirects included, must be plain http(s) on the standard port and
resolve only to public addresses. The request is then sent to the address we
checked (with the real hostname for Host and TLS), so a second DNS answer can't
swap in a private one.
"""

from __future__ import annotations

import asyncio
import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import SplitResult, urljoin, urlsplit, urlunsplit

import httpx

from app.core.errors import UnprocessableError

DEFAULT_PORTS = {"http": 80, "https": 443}
MAX_REDIRECTS = 3
MAX_BYTES = 2_000_000
TEXT_TYPES = ("text/html", "text/plain", "application/xhtml+xml")


class BlockedUrlError(UnprocessableError):
    code = "url_not_allowed"

    def __init__(self) -> None:
        super().__init__("Tailr can only open public web pages. Paste the job description instead.")


class FetchError(UnprocessableError):
    code = "page_unreadable"

    def __init__(self) -> None:
        super().__init__("We couldn't open that page. Paste the job description instead.")


@dataclass(frozen=True)
class PublicPage:
    url: str
    text: str


def is_public(address: str) -> bool:
    """True only for globally routable unicast addresses."""
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not (ip.is_multicast or ip.is_reserved or ip.is_unspecified)


def check_url(url: str) -> SplitResult:
    """The parsed URL, if it's a plain web address on a standard port."""
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError as error:
        raise BlockedUrlError() from error
    scheme = parts.scheme.lower()
    if (
        scheme not in DEFAULT_PORTS
        or not parts.hostname
        or parts.username is not None
        or parts.password is not None
        or (port is not None and port != DEFAULT_PORTS[scheme])
    ):
        raise BlockedUrlError()
    return parts


async def _addresses(host: str, port: int) -> list[str]:
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        return []
    return [str(info[4][0]) for info in infos]


def _literal(host: str) -> str | None:
    try:
        return str(ipaddress.ip_address(host))
    except ValueError:
        return None


async def _public_address(host: str, port: int) -> str:
    literal = _literal(host)
    addresses = [literal] if literal else await _addresses(host, port)
    if not addresses:
        raise FetchError()
    if not all(is_public(address) for address in addresses):
        raise BlockedUrlError()
    return addresses[0]


def _pinned(parts: SplitResult, address: str) -> str:
    host = f"[{address}]" if ":" in address else address
    return urlunsplit((parts.scheme, host, parts.path or "/", parts.query, ""))


async def _read_capped(response: httpx.Response, max_bytes: int) -> bytes:
    body = bytearray()
    async for chunk in response.aiter_bytes():
        body.extend(chunk)
        if len(body) > max_bytes:
            raise FetchError()
    return bytes(body)


async def fetch_public(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    timeout_seconds: float = 20,
    max_bytes: int = MAX_BYTES,
    transport: httpx.AsyncBaseTransport | None = None,
) -> PublicPage:
    """GET a public text page, re-checking every redirect hop."""
    async with httpx.AsyncClient(timeout=timeout_seconds, transport=transport) as client:
        for _ in range(MAX_REDIRECTS + 1):
            parts = check_url(url)
            hostname = parts.hostname or ""
            scheme = parts.scheme.lower()
            address = await _public_address(hostname, DEFAULT_PORTS[scheme])
            request = client.build_request(
                "GET",
                _pinned(parts, address),
                headers={**(headers or {}), "Host": hostname},
                extensions={"sni_hostname": hostname} if scheme == "https" else {},
            )
            try:
                response = await client.send(request, stream=True)
            except httpx.HTTPError as error:
                raise FetchError() from error
            try:
                if response.is_redirect:
                    url = urljoin(url, response.headers.get("location", ""))
                    continue
                content_type = response.headers.get("content-type", "").lower()
                if response.status_code >= 400 or not content_type.startswith(TEXT_TYPES):
                    raise FetchError()
                body = await _read_capped(response, max_bytes)
                text = body.decode(response.encoding or "utf-8", "replace")
                return PublicPage(url=url, text=text)
            finally:
                await response.aclose()
    raise FetchError()
