"""Platform administration: ground verification, user management, moderation.

Admins sit above the owner/manager hierarchy, so nothing here scopes by
ownership — the role gate in the router is the only boundary.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import business_rule, not_found, validation_error
from app.core.security import utcnow
from app.services import notification_service
from app.services.serializers import ground_to_out, review_to_out, user_to_out
from app.utils.ids import to_oid

GROUND_STATUSES = {"pending_verification", "active", "inactive", "suspended"}
USER_ROLES = {"player", "manager", "ground_owner", "admin"}


def _regex(value: str) -> dict:
    return {"$regex": re.escape(value), "$options": "i"}


# ---- Grounds ----------------------------------------------------------------

async def list_grounds(
    db: AsyncIOMotorDatabase,
    *,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    filt: dict = {}
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        unknown = set(statuses) - GROUND_STATUSES
        if unknown:
            raise validation_error(f"Unknown ground status: {sorted(unknown)}")
        filt["status"] = {"$in": statuses}
    if search:
        filt["$or"] = [{"name": _regex(search)}, {"area": _regex(search)}, {"city": _regex(search)}]

    total = await db.grounds.count_documents(filt)
    # Pending grounds first (that's the admin's work queue), newest within each group.
    cursor = (
        db.grounds.find(filt)
        .sort([("status", 1), ("created_at", -1)])
        .skip(offset)
        .limit(limit)
    )

    items = []
    async for ground in cursor:
        out = ground_to_out(ground)
        owner = await db.users.find_one({"_id": ground.get("owner_id")}, {"full_name": 1, "phone": 1})
        out["owner_name"] = (owner or {}).get("full_name")
        out["owner_phone"] = (owner or {}).get("phone")
        out["manager_count"] = await db.manager_assignments.count_documents(
            {"ground_id": ground["_id"], "is_active": True}
        )
        out["booking_count"] = await db.bookings.count_documents(
            {"ground_id": ground["_id"], "status": {"$ne": "cancelled"}}
        )
        items.append(out)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


async def set_ground_status(
    db: AsyncIOMotorDatabase,
    ground_id: str,
    *,
    status: str,
    reason: Optional[str] = None,
) -> dict:
    if status not in GROUND_STATUSES:
        raise validation_error(f"Unknown ground status: {status!r}")
    ground = await db.grounds.find_one({"_id": to_oid(ground_id)})
    if not ground:
        raise not_found("Ground not found.")

    update = {"status": status, "updated_at": utcnow()}
    if status == "active":
        update["verified_at"] = utcnow()
        update["rejection_reason"] = None
    if reason:
        update["rejection_reason" if status != "active" else "verification_note"] = reason

    await db.grounds.update_one({"_id": ground["_id"]}, {"$set": update})
    ground = await db.grounds.find_one({"_id": ground["_id"]})
    notification_service.notify_in_background(
        notification_service.notify_ground_status(db, ground, status, reason)
    )
    return ground_to_out(ground)


# ---- Users ------------------------------------------------------------------

async def list_users(
    db: AsyncIOMotorDatabase,
    *,
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    filt: dict = {}
    if role:
        roles = [r.strip() for r in role.split(",") if r.strip()]
        unknown = set(roles) - USER_ROLES
        if unknown:
            raise validation_error(f"Unknown role: {sorted(unknown)}")
        filt["role"] = {"$in": roles}
    if search:
        filt["$or"] = [{"full_name": _regex(search)}, {"phone": _regex(search)}]

    total = await db.users.count_documents(filt)
    cursor = db.users.find(filt).sort("created_at", -1).skip(offset).limit(limit)

    items = []
    async for user in cursor:
        out = user_to_out(user)
        out["is_suspended"] = bool(user.get("is_suspended", False))
        out["deleted_at"] = user.get("deleted_at").isoformat() if user.get("deleted_at") else None
        if out["role"] == "ground_owner":
            out["ground_count"] = await db.grounds.count_documents({"owner_id": user["_id"]})
        elif out["role"] == "player":
            out["booking_count"] = await db.bookings.count_documents({"player_id": user["_id"]})
        items.append(out)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


async def update_user(
    db: AsyncIOMotorDatabase,
    admin: dict,
    user_id: str,
    *,
    role: Optional[str] = None,
    is_suspended: Optional[bool] = None,
) -> dict:
    uid = to_oid(user_id)
    if uid == admin["_id"]:
        raise business_rule("CANNOT_MODIFY_SELF", "Admins cannot change their own role or status.")
    user = await db.users.find_one({"_id": uid})
    if not user:
        raise not_found("User not found.")

    update: dict = {}
    if role is not None:
        if role not in USER_ROLES:
            raise validation_error(f"Unknown role: {role!r}")
        if role != "manager" and user.get("role") == "manager":
            # Leaving them assigned would keep granting ground access they no
            # longer have the role to use.
            await db.manager_assignments.update_many(
                {"manager_id": uid, "is_active": True},
                {"$set": {"is_active": False, "removed_at": utcnow()}},
            )
        update["role"] = role
    if is_suspended is not None:
        update["is_suspended"] = is_suspended
        if is_suspended:
            # Force re-auth; a suspended user's next request fails the account check.
            await db.refresh_tokens.delete_many({"user_id": uid})

    if update:
        update["updated_at"] = utcnow()
        await db.users.update_one({"_id": uid}, {"$set": update})
        user = await db.users.find_one({"_id": uid})

    out = user_to_out(user)
    out["is_suspended"] = bool(user.get("is_suspended", False))
    return out


# ---- Review moderation ------------------------------------------------------

async def list_reviews(
    db: AsyncIOMotorDatabase,
    *,
    ground_id: Optional[str] = None,
    visible: Optional[bool] = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    filt: dict = {}
    if ground_id:
        filt["ground_id"] = to_oid(ground_id)
    if visible is not None:
        filt["is_visible"] = visible

    total = await db.reviews.count_documents(filt)
    cursor = db.reviews.find(filt).sort("created_at", -1).skip(offset).limit(limit)

    items = []
    async for review in cursor:
        out = review_to_out(review)
        ground = await db.grounds.find_one({"_id": review["ground_id"]}, {"name": 1})
        out["ground_name"] = (ground or {}).get("name", "")
        items.append(out)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


async def set_review_visibility(db: AsyncIOMotorDatabase, review_id: str, *, is_visible: bool) -> dict:
    review = await db.reviews.find_one({"_id": to_oid(review_id)})
    if not review:
        raise not_found("Review not found.")
    await db.reviews.update_one(
        {"_id": review["_id"]}, {"$set": {"is_visible": is_visible, "updated_at": utcnow()}}
    )
    # Hidden reviews must stop counting toward the ground's public rating.
    await _recalc_ground_rating(db, review["ground_id"])
    review = await db.reviews.find_one({"_id": review["_id"]})
    return review_to_out(review)


async def _recalc_ground_rating(db: AsyncIOMotorDatabase, ground_id) -> None:
    pipeline = [
        {"$match": {"ground_id": ground_id, "is_visible": True}},
        {"$group": {"_id": "$ground_id", "avg": {"$avg": "$overall_rating"}, "count": {"$sum": 1}}},
    ]
    doc = None
    async for d in db.reviews.aggregate(pipeline):
        doc = d
        break
    await db.grounds.update_one(
        {"_id": ground_id},
        {"$set": {
            "avg_rating": round(float(doc["avg"]), 2) if doc else 0.0,
            "review_count": int(doc["count"]) if doc else 0,
        }},
    )


# ---- Platform analytics -----------------------------------------------------

def _period_bounds(period: str) -> tuple[datetime, datetime, list[str]]:
    now = datetime.now(tz=timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    spans = {"today": 1, "week": 7, "month": 30}
    if period not in spans:
        raise validation_error("period must be one of: today, week, month")
    start = today - timedelta(days=spans[period] - 1)
    end = today + timedelta(days=1)
    days = [(start + timedelta(days=i)).date().isoformat() for i in range(spans[period])]
    return start, end, days


async def get_platform_analytics(db: AsyncIOMotorDatabase, *, period: str = "week") -> dict:
    start, end, days = _period_bounds(period)
    window = {"created_at": {"$gte": start, "$lt": end}}

    totals = {
        "players": await db.users.count_documents({"role": "player"}),
        "managers": await db.users.count_documents({"role": "manager"}),
        "owners": await db.users.count_documents({"role": "ground_owner"}),
        "grounds_active": await db.grounds.count_documents({"status": "active"}),
        "grounds_pending": await db.grounds.count_documents({"status": "pending_verification"}),
        "grounds_suspended": await db.grounds.count_documents({"status": "suspended"}),
        "bookings_total": await db.bookings.count_documents({}),
        "reviews_total": await db.reviews.count_documents({}),
        "reviews_hidden": await db.reviews.count_documents({"is_visible": False}),
    }

    revenue_pipeline = [
        {"$match": {**window, "status": {"$nin": ["cancelled"]}}},
        {
            "$group": {
                "_id": None,
                "bookings": {"$sum": 1},
                "gross_value": {"$sum": "$total_price"},
                "collected": {
                    "$sum": {
                        "$add": [
                            {"$ifNull": ["$advance_amount", 0]},
                            {"$ifNull": ["$remainder_collected", 0]},
                        ]
                    }
                },
            }
        },
    ]
    period_metrics = {"bookings": 0, "gross_value": 0.0, "collected": 0.0}
    async for doc in db.bookings.aggregate(revenue_pipeline):
        period_metrics = {
            "bookings": int(doc.get("bookings", 0)),
            "gross_value": float(doc.get("gross_value", 0)),
            "collected": float(doc.get("collected", 0)),
        }

    status_breakdown: dict[str, int] = {}
    async for doc in db.bookings.aggregate(
        [{"$match": window}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ):
        status_breakdown[doc["_id"] or "unknown"] = int(doc["count"])

    daily = {d: 0 for d in days}
    async for doc in db.bookings.aggregate(
        [
            {"$match": {**window, "status": {"$nin": ["cancelled"]}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1},
                }
            },
        ]
    ):
        if doc["_id"] in daily:
            daily[doc["_id"]] = int(doc["count"])

    top_grounds = []
    async for doc in db.bookings.aggregate(
        [
            {"$match": {**window, "status": {"$nin": ["cancelled"]}}},
            {
                "$group": {
                    "_id": "$ground_id",
                    "ground_name": {"$first": "$ground_name"},
                    "bookings": {"$sum": 1},
                    "revenue": {"$sum": "$total_price"},
                }
            },
            {"$sort": {"bookings": -1}},
            {"$limit": 5},
        ]
    ):
        top_grounds.append(
            {
                "ground_id": str(doc["_id"]),
                "ground_name": doc.get("ground_name") or "",
                "bookings": int(doc["bookings"]),
                "revenue": float(doc.get("revenue", 0)),
            }
        )

    return {
        "period": period,
        "totals": totals,
        "period_metrics": period_metrics,
        "booking_status_breakdown": status_breakdown,
        "daily_volume": [{"date": d, "count": c} for d, c in daily.items()],
        "top_grounds": top_grounds,
    }
