from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import conflict, not_found
from app.core.security import utcnow
from app.services.serializers import assignment_to_out
from app.utils.ids import to_oid


def _period_range(period: str) -> tuple[datetime, datetime, datetime, datetime, list[str]]:
    """Return (current_start, current_end, previous_start, previous_end, day_buckets)."""
    now = datetime.now(tz=timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "today":
        current_start = today
        current_end = today + timedelta(days=1)
        previous_start = today - timedelta(days=1)
        previous_end = today
    elif period == "week":
        current_start = today - timedelta(days=6)
        current_end = today + timedelta(days=1)
        previous_start = current_start - timedelta(days=7)
        previous_end = current_start
    else:  # month
        current_start = today - timedelta(days=29)
        current_end = today + timedelta(days=1)
        previous_start = current_start - timedelta(days=30)
        previous_end = current_start

    days: list[str] = []
    cur = current_start
    while cur < current_end:
        days.append(cur.date().isoformat())
        cur += timedelta(days=1)
    return current_start, current_end, previous_start, previous_end, days


def _trend(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100.0, 2)


async def _aggregate_metrics(
    db: AsyncIOMotorDatabase,
    ground_ids: List[ObjectId],
    start: datetime,
    end: datetime,
) -> dict:
    if not ground_ids:
        return {"bookings_count": 0, "estimated_revenue": 0.0, "collected_revenue": 0.0}
    match = {
        "ground_id": {"$in": ground_ids},
        "created_at": {"$gte": start, "$lt": end},
        "status": {"$nin": ["cancelled"]},
    }
    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": None,
                "bookings_count": {"$sum": 1},
                "estimated_revenue": {"$sum": "$total_price"},
                "collected_revenue": {
                    "$sum": {"$add": [{"$ifNull": ["$advance_amount", 0]}, {"$ifNull": ["$remainder_collected", 0]}]}
                },
            }
        },
    ]
    async for d in db.bookings.aggregate(pipeline):
        return {
            "bookings_count": int(d.get("bookings_count", 0)),
            "estimated_revenue": float(d.get("estimated_revenue", 0)),
            "collected_revenue": float(d.get("collected_revenue", 0)),
        }
    return {"bookings_count": 0, "estimated_revenue": 0.0, "collected_revenue": 0.0}


async def get_analytics(
    db: AsyncIOMotorDatabase,
    owner_id: ObjectId,
    *,
    period: str,
    ground_id: Optional[str] = None,
) -> dict:
    grounds = await db.grounds.find({"owner_id": owner_id}).to_list(length=200)
    all_ids = [g["_id"] for g in grounds]
    filtered_ids = all_ids
    if ground_id:
        gid = to_oid(ground_id)
        if gid not in all_ids:
            from app.core.exceptions import forbidden

            raise forbidden("You do not own this ground.")
        filtered_ids = [gid]

    cur_start, cur_end, prev_start, prev_end, days = _period_range(period)
    cur = await _aggregate_metrics(db, filtered_ids, cur_start, cur_end)
    prev = await _aggregate_metrics(db, filtered_ids, prev_start, prev_end)

    period_metrics = {
        "bookings_count": cur["bookings_count"],
        "bookings_trend_percent": _trend(cur["bookings_count"], prev["bookings_count"]),
        "estimated_revenue": cur["estimated_revenue"],
        "estimated_revenue_trend_percent": _trend(cur["estimated_revenue"], prev["estimated_revenue"]),
        "collected_revenue": cur["collected_revenue"],
        "collected_revenue_trend_percent": _trend(cur["collected_revenue"], prev["collected_revenue"]),
    }

    # Daily volume
    daily: dict[str, int] = {d: 0 for d in days}
    if filtered_ids:
        pipeline = [
            {
                "$match": {
                    "ground_id": {"$in": filtered_ids},
                    "created_at": {"$gte": cur_start, "$lt": cur_end},
                    "status": {"$nin": ["cancelled"]},
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "count": {"$sum": 1},
                }
            },
        ]
        async for d in db.bookings.aggregate(pipeline):
            daily[d["_id"]] = int(d.get("count", 0))
    daily_volume = [{"date": d, "count": c} for d, c in daily.items()]

    per_ground = []
    target_grounds = [g for g in grounds if (g["_id"] in filtered_ids)]
    for g in target_grounds:
        g_cur = await _aggregate_metrics(db, [g["_id"]], cur_start, cur_end)
        g_prev = await _aggregate_metrics(db, [g["_id"]], prev_start, prev_end)
        per_ground.append(
            {
                "ground_id": str(g["_id"]),
                "ground_name": g.get("name", ""),
                "metrics": {
                    "bookings_count": g_cur["bookings_count"],
                    "bookings_trend_percent": _trend(g_cur["bookings_count"], g_prev["bookings_count"]),
                    "estimated_revenue": g_cur["estimated_revenue"],
                    "estimated_revenue_trend_percent": _trend(g_cur["estimated_revenue"], g_prev["estimated_revenue"]),
                    "collected_revenue": g_cur["collected_revenue"],
                    "collected_revenue_trend_percent": _trend(g_cur["collected_revenue"], g_prev["collected_revenue"]),
                },
            }
        )
    return {"period": period_metrics, "daily_volume": daily_volume, "per_ground": per_ground}


async def list_assignments(db: AsyncIOMotorDatabase, ground_id: str) -> List[dict]:
    gid = to_oid(ground_id)
    ground = await db.grounds.find_one({"_id": gid})
    if not ground:
        raise not_found("Ground not found.")
    cursor = db.manager_assignments.find({"ground_id": gid})
    out = []
    async for a in cursor:
        manager = await db.users.find_one({"_id": a.get("manager_id")}) if a.get("manager_id") else None
        out.append(assignment_to_out(a, ground, manager))
    return out


async def assign_manager(db: AsyncIOMotorDatabase, ground_id: str, phone: str) -> dict:
    gid = to_oid(ground_id)
    ground = await db.grounds.find_one({"_id": gid})
    if not ground:
        raise not_found("Ground not found.")

    manager_user = await db.users.find_one({"phone": phone})
    manager_id: Optional[ObjectId] = manager_user["_id"] if manager_user else None

    # Prevent duplicate active assignments by manager_id or by manager_phone (pre-signup).
    existing_filter: list[dict] = []
    if manager_id:
        existing_filter.append({"manager_id": manager_id})
    existing_filter.append({"manager_phone": phone})
    existing = await db.manager_assignments.find_one(
        {"ground_id": gid, "$or": existing_filter, "is_active": True}
    )
    if existing:
        raise conflict("MANAGER_ALREADY_ASSIGNED", "Manager already assigned to this ground.")

    now = utcnow()
    doc = {
        "ground_id": gid,
        "manager_id": manager_id,
        "manager_phone": phone,
        "is_active": True,
        "assigned_at": now,
        "created_at": now,
    }
    result = await db.manager_assignments.insert_one(doc)
    doc["_id"] = result.inserted_id
    if manager_user and manager_user.get("role") == "player":
        await db.users.update_one({"_id": manager_user["_id"]}, {"$set": {"role": "manager"}})
    return assignment_to_out(doc, ground, manager_user)


async def remove_manager(db: AsyncIOMotorDatabase, ground_id: str, manager_id: str) -> None:
    gid = to_oid(ground_id)
    mid = to_oid(manager_id)
    result = await db.manager_assignments.update_many(
        {"ground_id": gid, "manager_id": mid, "is_active": True},
        {"$set": {"is_active": False, "removed_at": utcnow()}},
    )
    if result.modified_count == 0:
        raise not_found("Manager assignment not found.")
    # If manager has no other active assignments, demote back to player.
    other = await db.manager_assignments.find_one({"manager_id": mid, "is_active": True})
    if not other:
        await db.users.update_one({"_id": mid, "role": "manager"}, {"$set": {"role": "player"}})
