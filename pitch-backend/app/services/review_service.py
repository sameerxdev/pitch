from __future__ import annotations

from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import business_rule, conflict, forbidden, not_found
from app.core.security import utcnow
from app.services.serializers import review_to_out
from app.utils.ids import to_oid


async def _recalc_ground_rating(db: AsyncIOMotorDatabase, ground_id: ObjectId) -> None:
    pipeline = [
        {"$match": {"ground_id": ground_id, "is_visible": True}},
        {
            "$group": {
                "_id": "$ground_id",
                "avg": {"$avg": "$overall_rating"},
                "count": {"$sum": 1},
            }
        },
    ]
    doc = None
    async for d in db.reviews.aggregate(pipeline):
        doc = d
        break
    avg = round(float(doc["avg"]), 2) if doc else 0.0
    count = int(doc["count"]) if doc else 0
    await db.grounds.update_one(
        {"_id": ground_id}, {"$set": {"avg_rating": avg, "review_count": count}}
    )


async def submit_review(db: AsyncIOMotorDatabase, player: dict, body: dict) -> dict:
    booking = await db.bookings.find_one({"_id": to_oid(body["booking_id"])})
    if not booking:
        raise not_found("Booking not found.")
    if booking["player_id"] != player["_id"]:
        raise forbidden("Not your booking.")
    if booking.get("status") != "completed":
        raise business_rule("REVIEW_NOT_ALLOWED", "Only completed bookings can be reviewed.")
    existing = await db.reviews.find_one({"booking_id": booking["_id"]})
    if existing:
        raise conflict("REVIEW_EXISTS", "Review already submitted for this booking.")

    now = utcnow()
    doc = {
        "booking_id": booking["_id"],
        "ground_id": booking["ground_id"],
        "player_id": player["_id"],
        "player_name": player.get("full_name") or "Player",
        "overall_rating": body["overall_rating"],
        "rating_pitch": body.get("rating_pitch"),
        "rating_cleanliness": body.get("rating_cleanliness"),
        "rating_value": body.get("rating_value"),
        "rating_manager": body.get("rating_manager"),
        "review_text": body.get("review_text"),
        "photos": body.get("photos", []),
        "is_visible": True,
        "manager_reply": None,
        "manager_reply_at": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.reviews.insert_one(doc)
    doc["_id"] = result.inserted_id
    await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"review_submitted": True}})
    await _recalc_ground_rating(db, booking["ground_id"])
    return review_to_out(doc)


async def reply_to_review(db: AsyncIOMotorDatabase, user: dict, review_id: str, reply_text: str) -> dict:
    review = await db.reviews.find_one({"_id": to_oid(review_id)})
    if not review:
        raise not_found("Review not found.")
    role = user.get("role")
    if role == "manager":
        assignment = await db.manager_assignments.find_one(
            {"ground_id": review["ground_id"], "manager_id": user["_id"], "is_active": True}
        )
        if not assignment:
            raise forbidden("You are not assigned to this ground.")
    elif role == "ground_owner":
        ground = await db.grounds.find_one({"_id": review["ground_id"]})
        if not ground or ground.get("owner_id") != user["_id"]:
            raise forbidden("You do not own this ground.")
    else:
        raise forbidden()
    now = utcnow()
    await db.reviews.update_one(
        {"_id": review["_id"]},
        {"$set": {"manager_reply": reply_text, "manager_reply_at": now, "updated_at": now}},
    )
    review = await db.reviews.find_one({"_id": review["_id"]})
    return review_to_out(review)


async def list_reviews_for_ground(
    db: AsyncIOMotorDatabase,
    ground_id: str,
    *,
    sort: str = "newest",
    limit: int = 20,
    offset: int = 0,
    visible_only: bool = False,
) -> dict:
    gid = to_oid(ground_id)
    filt: dict = {"ground_id": gid}
    if visible_only:
        filt["is_visible"] = True
    direction = -1 if sort != "oldest" else 1
    total = await db.reviews.count_documents(filt)
    cursor = db.reviews.find(filt).sort("created_at", direction).skip(offset).limit(limit)
    items = [review_to_out(r) async for r in cursor]
    return {"items": items, "total": total, "limit": limit, "offset": offset}
