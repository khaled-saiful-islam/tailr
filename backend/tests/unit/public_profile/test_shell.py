"""Which shell a public page is built from: the built one, unless asked through Vite in dev."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from starlette.requests import Request

from app.modules.public_profile import shell

BUILT = "http://frontend/public.html"
VITE = "http://host.docker.internal:8403/public.html"


def _request(headers: dict[str, str]) -> Request:
    raw = [(key.lower().encode(), value.encode()) for key, value in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/p/demo", "headers": raw})


def _settings(monkeypatch: pytest.MonkeyPatch, dev: str | None) -> None:
    fake = SimpleNamespace(web_shell_url=BUILT, dev_shell_url=dev)
    monkeypatch.setattr(shell, "get_settings", lambda: fake)


def test_pages_through_nginx_use_the_built_shell_even_in_development(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _settings(monkeypatch, VITE)
    assert shell.shell_url(_request({})) == BUILT
    assert shell.shell_url(None) == BUILT


def test_pages_through_the_dev_server_use_its_shell(monkeypatch: pytest.MonkeyPatch) -> None:
    _settings(monkeypatch, VITE)
    assert shell.shell_url(_request({"X-Tailr-Dev-Shell": "1"})) == VITE


def test_the_header_does_nothing_without_a_dev_shell(monkeypatch: pytest.MonkeyPatch) -> None:
    _settings(monkeypatch, None)
    assert shell.shell_url(_request({"X-Tailr-Dev-Shell": "1"})) == BUILT
