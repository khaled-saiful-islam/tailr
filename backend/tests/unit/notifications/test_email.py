"""Outgoing mail reaches a real provider: TLS and a login when one is configured."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Any

import pytest

from app.core.config import Settings
from app.modules.notifications import email


class FakeSMTP:
    """Records what the sender did, in order."""

    instances: list[FakeSMTP] = []

    def __init__(self, host: str, port: int, **kwargs: Any) -> None:
        self.host = host
        self.port = port
        self.kwargs = kwargs
        self.calls: list[str] = []
        FakeSMTP.instances.append(self)

    def __enter__(self) -> FakeSMTP:
        return self

    def __exit__(self, *exc: object) -> None:
        self.calls.append("quit")

    def starttls(self, **kwargs: Any) -> None:
        self.calls.append("starttls")

    def login(self, user: str, password: str) -> None:
        self.calls.append(f"login:{user}:{password}")

    def send_message(self, message: EmailMessage) -> None:
        self.calls.append("send")


class FakeSMTPSSL(FakeSMTP):
    pass


@pytest.fixture
def smtp(monkeypatch: pytest.MonkeyPatch) -> type[FakeSMTP]:
    FakeSMTP.instances = []
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTPSSL)
    return FakeSMTP


def use(monkeypatch: pytest.MonkeyPatch, **values: Any) -> None:
    settings = Settings(smtp_host="mail.example.com", **values)
    monkeypatch.setattr(email, "get_settings", lambda: settings)


def sent_with(smtp: type[FakeSMTP]) -> FakeSMTP:
    assert len(smtp.instances) == 1
    return smtp.instances[0]


def test_plain_smtp_sends_without_tls_or_login(
    monkeypatch: pytest.MonkeyPatch, smtp: type[FakeSMTP]
) -> None:
    use(monkeypatch, smtp_port=1025)
    email._send(EmailMessage())
    client = sent_with(smtp)
    assert (client.host, client.port) == ("mail.example.com", 1025)
    assert client.calls == ["send", "quit"]


def test_starttls_upgrades_then_logs_in(
    monkeypatch: pytest.MonkeyPatch, smtp: type[FakeSMTP]
) -> None:
    use(
        monkeypatch,
        smtp_port=587,
        smtp_security="starttls",
        smtp_username="apikey",
        smtp_password="s3cret",
    )
    email._send(EmailMessage())
    client = sent_with(smtp)
    assert type(client) is FakeSMTP
    assert client.calls == ["starttls", "login:apikey:s3cret", "send", "quit"]


def test_ssl_connects_encrypted_from_the_start(
    monkeypatch: pytest.MonkeyPatch, smtp: type[FakeSMTP]
) -> None:
    use(
        monkeypatch,
        smtp_port=465,
        smtp_security="ssl",
        smtp_username="apikey",
        smtp_password="s3cret",
    )
    email._send(EmailMessage())
    client = sent_with(smtp)
    assert type(client) is FakeSMTPSSL
    assert "context" in client.kwargs
    assert client.calls == ["login:apikey:s3cret", "send", "quit"]


def _production(**values: Any) -> Settings:
    return Settings(
        app_env="production",
        secret_key="x" * 48,
        cookie_secure=True,
        seed_admin_password="a-long-admin-password",
        llm_api_key="key",
        **values,
    )


def test_production_refuses_email_without_a_real_mail_server() -> None:
    with pytest.raises(RuntimeError, match="SMTP_HOST"):
        _production(email_enabled=True, smtp_host="mailpit").validate_for_production()


def test_production_allows_email_off_or_through_a_provider() -> None:
    _production(email_enabled=False, smtp_host="mailpit").validate_for_production()
    _production(
        email_enabled=True, smtp_host="smtp.example.com", smtp_security="starttls"
    ).validate_for_production()
