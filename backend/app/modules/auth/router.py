from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, DbSession, client_ip, session_token
from app.core.config import get_settings
from app.core.schemas import Ok
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    SessionOut,
    UpdateMeRequest,
    UserOut,
)
from app.modules.auth.service import AuthService, IssuedSession

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, issued: IssuedSession) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        issued.token,
        max_age=issued.max_age_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest, request: Request, response: Response, db: DbSession
) -> UserOut:
    service = AuthService(db)
    user = await service.register(data)
    issued = await service.start_session(
        user, user_agent=request.headers.get("user-agent"), ip_address=client_ip(request)
    )
    _set_session_cookie(response, issued)
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, request: Request, response: Response, db: DbSession) -> UserOut:
    service = AuthService(db)
    ip = client_ip(request)
    user = await service.authenticate(data.identifier, data.password, client_ip=ip)
    issued = await service.start_session(
        user, user_agent=request.headers.get("user-agent"), ip_address=ip
    )
    _set_session_cookie(response, issued)
    return UserOut.model_validate(user)


@router.post("/logout", response_model=Ok)
async def logout(request: Request, response: Response, db: DbSession) -> Ok:
    token = session_token(request)
    if token:
        await AuthService(db).end_session(token)
    response.delete_cookie(get_settings().session_cookie_name, path="/")
    return Ok()


@router.get("/session", response_model=SessionOut)
async def current_session(request: Request, db: DbSession) -> SessionOut:
    token = session_token(request)
    user = await AuthService(db).resolve(token) if token else None
    return SessionOut(user=UserOut.model_validate(user) if user else None)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
async def update_me(data: UpdateMeRequest, user: CurrentUser, db: DbSession) -> UserOut:
    updated = await AuthService(db).update_me(user, data)
    return UserOut.model_validate(updated)


@router.post("/password", response_model=Ok)
async def change_password(
    data: ChangePasswordRequest, request: Request, user: CurrentUser, db: DbSession
) -> Ok:
    await AuthService(db).change_password(
        user, data.current_password, data.new_password, keep_token=session_token(request)
    )
    return Ok()
