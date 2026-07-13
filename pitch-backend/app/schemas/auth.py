from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import validate_phone
from app.schemas.user import UserOut


class RequestOtpBody(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return validate_phone(v)


class RequestOtpResponse(BaseModel):
    expires_in: int
    # Development helper field; ignored by production clients.
    debug_otp: Optional[str] = None


class VerifyOtpBody(BaseModel):
    phone: str
    otp: str = Field(..., min_length=4, max_length=8)

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return validate_phone(v)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


class VerifyOtpResponse(TokenPair):
    user: UserOut


class RefreshBody(BaseModel):
    refresh_token: str


class RefreshResponse(TokenPair):
    pass
