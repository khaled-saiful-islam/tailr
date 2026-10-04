"""Test harness.

* A separate database (`tailr_test`) migrated once per run with Alembic, so the
  migrations themselves are tested.
* Every test runs inside a transaction that is rolled back, so tests never see
  each other's rows and never touch development data.
* Redis uses database 15 and is flushed before each test.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator

os.environ["APP_ENV"] = "test"
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://tailr:tailr@localhost:8402/tailr_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:8404/15")
os.environ.setdefault("STORAGE_DIR", "/tmp/tailr-test-files")

import httpx
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.db import set_session_factory
from app.core.redis import close_redis, get_redis


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    url = get_settings().database_url
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    # Start from an empty schema every run, then apply every migration.
    await asyncio.to_thread(command.downgrade, config, "base")
    await asyncio.to_thread(command.upgrade, config, "head")
    eng = create_async_engine(url)
    yield eng
    await eng.dispose()


@pytest.fixture
async def connection(engine: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    async with engine.connect() as conn:
        transaction = await conn.begin()
        factory = async_sessionmaker(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        set_session_factory(factory)
        yield conn
        await transaction.rollback()


@pytest.fixture
async def db(connection: AsyncConnection) -> AsyncIterator[object]:
    from app.core.db import session_factory

    async with session_factory()() as session:
        yield session


@pytest.fixture(autouse=True)
async def clean_redis() -> AsyncIterator[None]:
    await close_redis()
    await get_redis().flushdb()
    yield
    await close_redis()


@pytest.fixture
async def client(connection: AsyncConnection) -> AsyncIterator[httpx.AsyncClient]:
    from app.main import create_app

    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


@pytest.fixture
async def signed_in(client: httpx.AsyncClient) -> httpx.AsyncClient:
    response = await client.post(
        "/api/v1/auth/register",
        json={"name": "Aina Rahman", "email": "aina@example.com", "password": "correct-horse-1"},
    )
    assert response.status_code == 201, response.text
    return client
