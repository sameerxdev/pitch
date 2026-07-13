from __future__ import annotations

from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import forbidden, not_found
from app.core.security import utcnow
from app.services.serializers import ground_to_out, review_to_out
from app.utils.ids import to_oid


async def get_ground(db: AsyncIOMotorDatabase, ground_id: str, *, players_only_active: bool = False) -> dict:
    gid = to_oid(ground_id)
    filt: dict = {"_id": gid}
    if players_only_active:
        filt["status"] = "active"
    ground = await db.grounds.find_one(filt)
    if not ground:
        raise not_found("Ground not found.")
    return ground


async def assert_owner(db: AsyncIOMotorDatabase, ground_id: str, owner_id: ObjectId) -> dict:
    ground = await get_ground(db, ground_id)
    if ground.get("owner_id") != owner_id:
        raise forbidden("You do not own this ground.")
    return ground


async def assert_manager_for_ground(db: AsyncIOMotorDatabase, ground_id: str, manager_id: ObjectId) -> dict:
    gid = to_oid(ground_id)
    assignment = await db.manager_assignments.find_one(
        {"ground_id": gid, "manager_id": manager_id, "is_active": True}
    )
    if not assignment:
        raise forbidden("You are not assigned to this ground.")
    ground = await db.grounds.find_one({"_id": gid})
    if not ground:
        raise not_found("Ground not found.")
    return ground


async def list_grounds_public(
    db: AsyncIOMotorDatabase,
    *,
    search: Optional[str],
    city: Optional[str],
    min_rating: Optional[float],
    max_price: Optional[float],
    lat: Optional[float],
    lng: Optional[float],
    limit: int,
    offset: int,
) -> dict:
    filt: dict = {"status": "active"}
    if city:
        filt["city"] = city
    if min_rating is not None:
        filt["avg_rating"] = {"$gte": min_rating}
    if max_price is not None:
        filt["hourly_rate_day"] = {"$lte": max_price}
    if search:
        filt["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"area": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
        ]
    total = await db.grounds.count_documents(filt)
    cursor = db.grounds.find(filt).sort("created_at", -1).skip(offset).limit(limit)
    items = [ground_to_out(g) async for g in cursor]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


async def get_ground_detail(db: AsyncIOMotorDatabase, ground_id: str, *, public: bool = True) -> dict:
    ground = await get_ground(db, ground_id, players_only_active=public)
    review_cursor = (
        db.reviews.find({"ground_id": ground["_id"], "is_visible": True})
        .sort("created_at", -1)
        .limit(5)
    )
    reviews = [review_to_out(r) async for r in review_cursor]
    out = ground_to_out(ground)
    out["latest_reviews"] = reviews
    return out


async def list_owner_grounds(db: AsyncIOMotorDatabase, owner_id: ObjectId) -> List[dict]:
    cursor = db.grounds.find({"owner_id": owner_id}).sort("created_at", -1)
    return [ground_to_out(g) async for g in cursor]


async def create_ground(db: AsyncIOMotorDatabase, owner_id: ObjectId, body: dict, photos: List[str]) -> dict:
    now = utcnow()
    doc = {
        "owner_id": owner_id,
        "name": body["name"],
        "city": body["city"],
        "area": body["area"],
        "address": body["address"],
        "latitude": body["latitude"],
        "longitude": body["longitude"],
        "hourly_rate_day": body["hourly_rate_day"],
        "hourly_rate_night": body["hourly_rate_night"],
        "advance_percent": body["advance_percent"],
        "facilities": body.get("facilities", []),
        "photos": photos,
        "status": "pending_verification",
        "avg_rating": 0.0,
        "review_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.grounds.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ground_to_out(doc)


async def update_ground(
    db: AsyncIOMotorDatabase,
    owner_id: ObjectId,
    ground_id: str,
    update_fields: dict,
    photos: Optional[List[str]] = None,
) -> dict:
    ground = await assert_owner(db, ground_id, owner_id)
    update: dict = {k: v for k, v in update_fields.items() if v is not None and k != "is_active"}
    if "is_active" in update_fields and update_fields["is_active"] is not None:
        if ground.get("status") == "pending_verification" and update_fields["is_active"]:
            # Owner cannot self-activate before admin verification.
            pass
        else:
            update["status"] = "active" if update_fields["is_active"] else "inactive"
    if photos:
        update["photos"] = ground.get("photos", []) + photos
    if update:
        update["updated_at"] = utcnow()
        await db.grounds.update_one({"_id": ground["_id"]}, {"$set": update})
    updated = await db.grounds.find_one({"_id": ground["_id"]})
    return ground_to_out(updated)
