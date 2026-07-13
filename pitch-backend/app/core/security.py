from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


def hash_secret(value: str) -> str:
    """Stable hash for OTP / refresh tokens. Not for passwords."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_secret(value: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_secret(value), hashed)


def generate_opaque_token(num_bytes: int = 32) -> str:
    return secrets.token_urlsafe(num_bytes)


def create_access_token(subject: str, extra: Optional[dict[str, Any]] = None) -> str:
    now = utcnow()
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, datetime]:
    now = utcnow()
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def create_qr_token(booking_id: str, ground_id: str) -> str:
    now = utcnow()
    payload = {
        "sub": booking_id,
        "ground_id": ground_id,
        "type": "qr",
        "iat": int(now.timestamp()),
        "jti": secrets.token_urlsafe(8),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_qr_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
