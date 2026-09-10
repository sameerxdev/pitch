from __future__ import annotations

from typing import Optional

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.exceptions import forbidden, unauthorized
from app.core.security import decode_token

# Declared so OpenAPI/Swagger exposes the "Authorize" dialog and attaches
# the bearer token to every protected request automatically.
bearer_scheme = HTTPBearer(auto_error=False, description="Paste the access_token returned by /auth/verify-otp.")


def _safe_oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise unauthorized("Invalid token subject.")


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Optional[dict]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        oid = _safe_oid(user_id)
    except Exception:
        return None
    user = await db.users.find_one({"_id": oid})
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    if credentials is None:
        raise unauthorized()
    if credentials.scheme.lower() != "bearer":
        raise unauthorized("Authorization scheme must be Bearer.")
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.PyJWTError as exc:
        raise unauthorized(f"Invalid token: {exc.__class__.__name__}")
    if payload.get("type") != "access":
        raise unauthorized("Wrong token type.")
    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized("Token missing subject.")
    oid = _safe_oid(user_id)
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise unauthorized("User no longer exists.")
    if user.get("is_suspended"):
        raise forbidden("This account has been suspended. Contact support.")
    if user.get("deleted_at"):
        raise unauthorized("This account has been deleted.")
    return user


def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise forbidden(f"Requires role: {', '.join(roles)}.")
        return user

    return dep


require_player = require_roles("player")
require_manager = require_roles("manager")
require_owner = require_roles("ground_owner")
require_admin = require_roles("admin")
