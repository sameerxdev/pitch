from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import business_rule, unauthorized, validation_error
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_secret,
    utcnow,
    verify_secret,
)
from app.utils.ids import to_oid


def _gen_otp(length: int) -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


async def request_otp(db: AsyncIOMotorDatabase, phone: str) -> dict:
    if settings.AUTH_BYPASS_OTP:
        # OTP service disabled — verify-otp will accept any code.
        return {"expires_in": settings.OTP_TTL_SECONDS, "debug_otp": "bypass"}
    code = _gen_otp(settings.OTP_LENGTH)
    expires_at = utcnow() + timedelta(seconds=settings.OTP_TTL_SECONDS)
    await db.otp_codes.delete_many({"phone": phone})
    await db.otp_codes.insert_one(
        {
            "phone": phone,
            "code_hash": hash_secret(code),
            "attempts": 0,
            "expires_at": expires_at,
            "created_at": utcnow(),
        }
    )
    out: dict = {"expires_in": settings.OTP_TTL_SECONDS}
    if settings.OTP_DEBUG:
        out["debug_otp"] = code
    return out


async def verify_otp(db: AsyncIOMotorDatabase, phone: str, otp: str) -> dict:
    if not settings.AUTH_BYPASS_OTP:
        record = await db.otp_codes.find_one({"phone": phone})
        if not record:
            raise validation_error("OTP not requested or expired.")
        if record["expires_at"].replace(tzinfo=timezone.utc) < utcnow():
            await db.otp_codes.delete_one({"_id": record["_id"]})
            raise validation_error("OTP expired.")
        if record.get("attempts", 0) >= settings.OTP_MAX_ATTEMPTS:
            await db.otp_codes.delete_one({"_id": record["_id"]})
            raise business_rule("OTP_LOCKED", "Too many attempts. Request a new OTP.")
        if not verify_secret(otp, record["code_hash"]):
            await db.otp_codes.update_one({"_id": record["_id"]}, {"$inc": {"attempts": 1}})
            raise validation_error("Invalid OTP.", {"otp": ["incorrect"]})

        await db.otp_codes.delete_one({"_id": record["_id"]})

    user = await db.users.find_one({"phone": phone})
    if not user:
        # First-time login: default to player; promote to manager if an owner has
        # already issued an assignment against this phone number.
        role = "player"
        assignment = await db.manager_assignments.find_one({"manager_phone": phone, "is_active": True})
        if assignment:
            role = "manager"
        doc = {
            "phone": phone,
            "full_name": None,
            "role": role,
            "city": None,
            "is_verified": True,
            "fcm_token": None,
            "created_at": utcnow(),
        }
        result = await db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        # If a manager invite created a placeholder assignment, attach the manager_id now.
        if assignment:
            await db.manager_assignments.update_many(
                {"manager_phone": phone},
                {"$set": {"manager_id": result.inserted_id}},
            )
        user = doc
    else:
        # Re-evaluate manager role for existing players if they have an active assignment
        if user.get("role") == "player":
            assignment = await db.manager_assignments.find_one({"manager_id": user["_id"], "is_active": True})
            if not assignment:
                assignment = await db.manager_assignments.find_one({"manager_phone": phone, "is_active": True})
                if assignment:
                    await db.manager_assignments.update_many(
                        {"manager_phone": phone},
                        {"$set": {"manager_id": user["_id"]}},
                    )
            if assignment:
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"role": "manager"}})
                user["role"] = "manager"

    tokens = await _issue_tokens(db, str(user["_id"]))
    return {"user": user, **tokens}


async def _issue_tokens(db: AsyncIOMotorDatabase, user_id: str) -> dict:
    access = create_access_token(user_id)
    refresh, refresh_expires = create_refresh_token(user_id)
    await db.refresh_tokens.insert_one(
        {
            "user_id": to_oid(user_id),
            "token_hash": hash_secret(refresh),
            "expires_at": refresh_expires,
            "created_at": utcnow(),
        }
    )
    return {"access_token": access, "refresh_token": refresh}


async def refresh_tokens(db: AsyncIOMotorDatabase, refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token)
    except jwt.PyJWTError:
        raise unauthorized("Invalid refresh token.")
    if payload.get("type") != "refresh":
        raise unauthorized("Wrong token type.")
    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized("Refresh token missing subject.")
    token_hash = hash_secret(refresh_token)
    record = await db.refresh_tokens.find_one({"token_hash": token_hash})
    if not record:
        raise unauthorized("Refresh token has been revoked.")
    # rotate
    await db.refresh_tokens.delete_one({"_id": record["_id"]})
    return await _issue_tokens(db, user_id)


async def logout(db: AsyncIOMotorDatabase, user_id: str, refresh_token: Optional[str] = None) -> None:
    if refresh_token:
        await db.refresh_tokens.delete_one({"token_hash": hash_secret(refresh_token)})
    else:
        await db.refresh_tokens.delete_many({"user_id": to_oid(user_id)})
