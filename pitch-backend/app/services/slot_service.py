from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import business_rule, not_found, validation_error
from app.core.security import utcnow
from app.schemas.slot import ApplySlotsBody, UpdateSlotBody
from app.services.serializers import slot_to_out
from app.utils.ids import to_oid


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _today_utc() -> date:
    return datetime.now(tz=timezone.utc).date()


async def list_slots(
    db: AsyncIOMotorDatabase,
    ground_id: str,
    *,
    date_str: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    player_window: bool = False,
) -> list[dict]:
    gid = to_oid(ground_id)
    filt: dict = {"ground_id": gid}
    if date_str:
        filt["date"] = date_str
    elif from_date and to_date:
        filt["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        filt["date"] = {"$gte": from_date}

    if player_window:
        today = _today_utc()
        window_end = today + timedelta(days=settings.PLAYER_MAX_BOOKING_DAYS_AHEAD)
        existing_dates = filt.get("date")
        constraint = {"$gte": today.isoformat(), "$lte": window_end.isoformat()}
        if isinstance(existing_dates, dict):
            constraint["$gte"] = max(constraint["$gte"], existing_dates.get("$gte", constraint["$gte"]))
            if "$lte" in existing_dates:
                constraint["$lte"] = min(constraint["$lte"], existing_dates["$lte"])
            filt["date"] = constraint
        elif isinstance(existing_dates, str):
            if not (constraint["$gte"] <= existing_dates <= constraint["$lte"]):
                return []
            # keep equality
        else:
            filt["date"] = constraint

    cursor = db.slots.find(filt).sort([("date", 1), ("start_hour", 1)])
    docs = [slot_to_out(d) async for d in cursor]
    return docs


async def update_slot(
    db: AsyncIOMotorDatabase,
    ground_id: str,
    slot_id: str,
    body: UpdateSlotBody,
) -> dict:
    slot = await db.slots.find_one({"_id": to_oid(slot_id), "ground_id": to_oid(ground_id)})
    if not slot:
        raise not_found("Slot not found.")
    update = {}
    if body.status is not None:
        if slot.get("status") == "booked":
            raise business_rule("SLOT_BOOKED", "Cannot change status of a booked slot.")
        if body.status == "blocked" and slot.get("status") == "on_hold":
            raise business_rule("SLOT_ON_HOLD", "Cannot block a slot currently on hold.")
        update["status"] = body.status
    if body.price is not None:
        update["price"] = body.price
    if not update:
        return slot_to_out(slot)
    update["updated_at"] = utcnow()
    await db.slots.update_one({"_id": slot["_id"]}, {"$set": update})
    slot = await db.slots.find_one({"_id": slot["_id"]})
    return slot_to_out(slot)


async def apply_slots(
    db: AsyncIOMotorDatabase,
    ground_id: str,
    body: ApplySlotsBody,
) -> dict:
    gid = to_oid(ground_id)
    today = _today_utc()
    from_d = _parse_date(body.from_date)
    to_d = _parse_date(body.to_date)
    if to_d < from_d:
        raise validation_error("to_date must be >= from_date.")
    if from_d < today:
        raise business_rule("PAST_DATE", "from_date must be today or later.")
    span = (to_d - from_d).days + 1
    if span > 90:
        raise business_rule("RANGE_TOO_LARGE", "Maximum range span is 90 days.")
    if not body.slots:
        raise validation_error("At least one slot template is required.")

    days_affected = 0
    total_upserted = 0
    now = utcnow()
    cur = from_d
    while cur <= to_d:
        date_str = cur.isoformat()
        days_affected += 1
        for tpl in body.slots:
            hours = tpl.end_hour - tpl.start_hour
            default_rate = body.hourly_rate_night if tpl.rate_type == "night" else body.hourly_rate_day
            price = tpl.price if tpl.price is not None else hours * default_rate
            existing = await db.slots.find_one(
                {"ground_id": gid, "date": date_str, "start_hour": tpl.start_hour}
            )
            if existing and existing.get("status") in ("booked", "on_hold"):
                # do not overwrite booked/on_hold; skip
                continue
            doc = {
                "ground_id": gid,
                "date": date_str,
                "start_hour": tpl.start_hour,
                "end_hour": tpl.end_hour,
                "rate_type": tpl.rate_type,
                "price": price,
                "status": existing.get("status", "available") if existing else "available",
                "hold_expires_at": None,
                "updated_at": now,
            }
            if not existing:
                doc["created_at"] = now
            await db.slots.update_one(
                {"ground_id": gid, "date": date_str, "start_hour": tpl.start_hour},
                {"$set": doc},
                upsert=True,
            )
            total_upserted += 1
        cur = cur + timedelta(days=1)
    return {
        "days_affected": days_affected,
        "slots_per_day": len(body.slots),
        "total_slots_upserted": total_upserted,
    }


async def release_expired_holds(db: AsyncIOMotorDatabase) -> int:
    """Release any on_hold slots whose hold_expires_at has passed; cancel the associated bookings."""
    now = utcnow()
    expired = db.slots.find(
        {"status": "on_hold", "hold_expires_at": {"$lt": now}}
    )
    released = 0
    async for slot in expired:
        await db.slots.update_one(
            {"_id": slot["_id"], "status": "on_hold"},
            {"$set": {"status": "available", "hold_expires_at": None}},
        )
        await db.bookings.update_many(
            {"slot_id": slot["_id"], "status": "on_hold"},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": now,
                    "cancellation_reason": "Hold expired",
                }
            },
        )
        released += 1
    return released
