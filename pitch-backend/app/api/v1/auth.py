from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.envelope import success
from app.schemas.auth import (
    RefreshBody,
    RefreshResponse,
    RequestOtpBody,
    RequestOtpResponse,
    VerifyOtpBody,
    VerifyOtpResponse,
)
from app.services import auth_service
from app.services.serializers import user_to_out

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp")
async def request_otp(body: RequestOtpBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.request_otp(db, body.phone)
    return success(RequestOtpResponse(**result).model_dump(exclude_none=True))


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.verify_otp(db, body.phone, body.otp)
    payload = VerifyOtpResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=user_to_out(result["user"]),
    )
    return success(payload.model_dump())


@router.post("/refresh")
async def refresh(body: RefreshBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.refresh_tokens(db, body.refresh_token)
    return success(RefreshResponse(**result).model_dump())


@router.post("/logout")
async def logout(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user=Depends(get_current_user),
    x_refresh_token: Optional[str] = Header(default=None, alias="X-Refresh-Token"),
):
    await auth_service.logout(db, str(user["_id"]), x_refresh_token)
    return success(None)
