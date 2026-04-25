"""
Authentication API routes: register, login, refresh, and current-user.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.services.user_service import get_user_service

logger = logging.getLogger(__name__)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ── Pydantic schemas ─────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str


# ── Dependency: get current user from Bearer token ───────────────────────

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    """Decode access token and return user dict; raise 401 on failure."""
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    svc = get_user_service()
    user = svc.get_user_by_id(user_id)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_role(*roles: str):
    """Factory that returns a dependency checking the user's role."""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return role_checker


# ── Routes ────────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    svc = get_user_service()
    result = svc.create_user(
        email=body.email,
        username=body.username,
        password=body.password,
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    auth = svc.authenticate(body.email, body.password)
    user = auth["user"]
    access = create_access_token({"sub": user["id"]})
    refresh = create_refresh_token({"sub": user["id"]})
    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    svc = get_user_service()
    result = svc.authenticate(body.email, body.password)
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=result["error"])

    user = result["user"]
    access = create_access_token({"sub": user["id"]})
    refresh = create_refresh_token({"sub": user["id"]})
    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    svc = get_user_service()
    user = svc.get_user_by_id(user_id)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access = create_access_token({"sub": user["id"]})
    refresh = create_refresh_token({"sub": user["id"]})
    return TokenResponse(access_token=access, refresh_token=refresh, user=user)


@router.get("/auth/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)
