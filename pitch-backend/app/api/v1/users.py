from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.envelope import success
from app.core.security import utcnow
from app.schemas.user import UpdateUserBody
from app.services.serializers import user_to_out

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return success(user_to_out(user))


@router.patch("/me")
async def update_me(
    body: UpdateUserBody,
    user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    update = body.model_dump(exclude_unset=True)
    if update:
        update["updated_at"] = utcnow()
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user = await db.users.find_one({"_id": user["_id"]})
    return success(user_to_out(user))


@router.delete("/me")
async def delete_me(
    user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"deleted_at": utcnow(), "is_verified": False, "fcm_token": None}},
    )
    await db.refresh_tokens.delete_many({"user_id": user["_id"]})
    return success(None)
