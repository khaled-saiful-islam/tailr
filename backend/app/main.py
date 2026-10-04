"""FastAPI application factory."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models as _models  # noqa: F401 - register every table before any query
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.db import dispose_engine, init_engine
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging, get_logger
from app.core.redis import close_redis
from app.modules.auth.seed import ensure_admin
from app.worker import broker

log = get_logger(__name__)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    init_engine(settings.database_url)
    await ensure_admin()
    if not broker.is_worker_process:
        await broker.startup()
    log.info("api_started", env=settings.app_env.value)
    yield
    if not broker.is_worker_process:
        await broker.shutdown()
    await close_redis()
    await dispose_engine()


def _origin_allowed(origin: str, settings: Settings, request: Request) -> bool:
    if origin in settings.cors_origins:
        return True
    # Same-origin requests through the nginx proxy carry the proxy's own host.
    return urlparse(origin).netloc == request.headers.get("host")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_for_production()
    configure_logging(settings)

    app = FastAPI(
        title="Tailr API",
        version="1.0.0",
        description="Jobs that fit. Applications made to measure.",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_context(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        # Cookie auth needs a CSRF guard: writes must come from an origin we trust.
        origin = request.headers.get("origin")
        if (
            request.method in UNSAFE_METHODS
            and origin
            and not _origin_allowed(origin, settings, request)
        ):
            return JSONResponse(
                status_code=403,
                content={"error": {"code": "bad_origin", "message": "Request origin not allowed."}},
            )
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

    install_error_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
