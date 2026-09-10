from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import business_rule, forbidden, not_found, validation_error
from app.core.security import create_qr_token, decode_qr_token, utcnow
from app.services import notification_service
from app.services.serializers import booking_to_out
from app.utils.ids import to_oid


def calculate_advance(total_price: float, advance_percent: int) -> float:
    raw = total_price * advance_percent / 100
    return float(math.ceil(raw / 10) * 10)


async def create_booking(db: AsyncIOMotorDatabase, player: dict, slot_id: str, ground_id: str) -> dict:
    sid = to_oid(slot_id)
    gid = to_oid(ground_id)
    slot = await db.slots.find_one({"_id": sid})
    if not slot:
        raise not_found("Slot not found.")
    if slot["ground_id"] != gid:
        raise validation_error("Slot does not belong to the provided ground.")

    ground = await db.grounds.find_one({"_id": gid, "status": "active"})
    if not ground:
        raise business_rule("GROUND_INACTIVE", "Ground is not available for bookings.")

    today = datetime.now(tz=timezone.utc).date()
    slot_date = datetime.strptime(slot["date"], "%Y-%m-%d").date()
    if slot_date < today:
        raise business_rule("BOOKING_WINDOW_EXCEEDED", "Slot date is in the past.")
    if (slot_date - today).days > settings.PLAYER_MAX_BOOKING_DAYS_AHEAD:
        raise business_rule(
            "BOOKING_WINDOW_EXCEEDED",
            f"Slot date is more than {settings.PLAYER_MAX_BOOKING_DAYS_AHEAD} days ahead.",
        )

    now = utcnow()
    hold_expires = now + timedelta(seconds=settings.HOLD_DURATION_SECONDS)

    # Atomic hold: only if slot is currently available.
    update_result = await db.slots.update_one(
        {"_id": sid, "status": "available"},
        {"$set": {"status": "on_hold", "hold_expires_at": hold_expires, "updated_at": now}},
    )
    if update_result.modified_count == 0:
        raise business_rule("SLOT_NOT_AVAILABLE", "This slot is no longer available.")

    total_price = float(slot.get("price", 0))
    advance_amount = calculate_advance(total_price, int(ground.get("advance_percent", 20)))

    booking_doc = {
        "slot_id": sid,
        "player_id": player["_id"],
        "player_name": player.get("full_name"),
        "player_phone": player.get("phone"),
        "ground_id": gid,
        "ground_name": ground.get("name"),
        "ground_area": ground.get("area"),
        "slot_date": slot["date"],
        "start_hour": slot["start_hour"],
        "end_hour": slot["end_hour"],
        "status": "on_hold",
        "total_price": total_price,
        "advance_amount": advance_amount,
        "qr_code": None,
        "qr_token": None,
        "arrived_at": None,
        "completion_payment_method": None,
        "remainder_collected": 0.0,
        "review_submitted": False,
        "cancelled_at": None,
        "cancellation_reason": None,
        "hold_expires_at": hold_expires,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.bookings.insert_one(booking_doc)
    booking_doc["_id"] = result.inserted_id

    return {
        "booking_id": str(result.inserted_id),
        "advance_amount": advance_amount,
        "total_price": total_price,
        "hold_expires_at": hold_expires.isoformat().replace("+00:00", "Z"),
    }


async def list_my_bookings(
    db: AsyncIOMotorDatabase,
    player_id: ObjectId,
    *,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    filt: dict = {"player_id": player_id}
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if statuses:
            filt["status"] = {"$in": statuses}
    total = await db.bookings.count_documents(filt)
    cursor = db.bookings.find(filt).sort("created_at", -1).skip(offset).limit(limit)
    items = [booking_to_out(b) async for b in cursor]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


async def get_booking(db: AsyncIOMotorDatabase, booking_id: str, *, user: dict) -> dict:
    booking = await db.bookings.find_one({"_id": to_oid(booking_id)})
    if not booking:
        raise not_found("Booking not found.")
    role = user.get("role")
    if role == "player":
        if booking["player_id"] != user["_id"]:
            raise forbidden("Not your booking.")
    elif role == "manager":
        assignment = await db.manager_assignments.find_one(
            {"ground_id": booking["ground_id"], "manager_id": user["_id"], "is_active": True}
        )
        if not assignment:
            raise forbidden("You are not assigned to this ground.")
    elif role == "ground_owner":
        ground = await db.grounds.find_one({"_id": booking["ground_id"]})
        if not ground or ground.get("owner_id") != user["_id"]:
            raise forbidden("You do not own this ground.")
    elif role != "admin":
        raise forbidden()
    return booking


async def cancel_booking(db: AsyncIOMotorDatabase, player: dict, booking_id: str) -> dict:
    booking = await get_booking(db, booking_id, user=player)
    if booking.get("status") in ("completed", "cancelled", "arrived"):
        raise business_rule("CANCEL_NOT_ALLOWED", f"Cannot cancel a {booking['status']} booking.")
    now = utcnow()
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "cancelled", "cancelled_at": now, "cancellation_reason": "Cancelled by player"}},
    )
    # Release slot
    await db.slots.update_one(
        {"_id": booking["slot_id"], "status": {"$in": ["on_hold", "booked"]}},
        {"$set": {"status": "available", "hold_expires_at": None}},
    )
    # Refund logic: mark completed payments as refunded (gateway refund out of scope).
    await db.payments.update_many(
        {"booking_id": booking["_id"], "status": "completed"},
        {"$set": {"status": "refunded", "refunded_at": now}},
    )
    booking = await db.bookings.find_one({"_id": booking["_id"]})
    notification_service.notify_in_background(
        notification_service.notify_booking_cancelled(db, booking, "Cancelled by player.")
    )
    return booking_to_out(booking)


async def arrive_booking(
    db: AsyncIOMotorDatabase,
    manager: dict,
    booking_id: str,
    *,
    method: str,
    qr_token: Optional[str] = None,
) -> dict:
    booking = await db.bookings.find_one({"_id": to_oid(booking_id)})
    if not booking:
        raise not_found("Booking not found.")
    assignment = await db.manager_assignments.find_one(
        {"ground_id": booking["ground_id"], "manager_id": manager["_id"], "is_active": True}
    )
    if not assignment:
        raise forbidden("You are not assigned to this ground.")

    if booking.get("status") == "arrived":
        raise business_rule("ARRIVAL_ALREADY_CONFIRMED", "Booking arrival already confirmed.")
    if booking.get("status") != "confirmed":
        raise business_rule(
            "INVALID_BOOKING_STATE",
            f"Booking cannot be marked arrived from status {booking.get('status')!r}.",
        )

    if method == "qr":
        if not qr_token:
            raise validation_error("qr_token is required when method is 'qr'.")
        try:
            payload = decode_qr_token(qr_token)
        except jwt.PyJWTError:
            raise business_rule("INVALID_QR_TOKEN", "QR token is invalid.")
        if payload.get("type") != "qr" or payload.get("sub") != str(booking["_id"]):
            raise business_rule("INVALID_QR_TOKEN", "QR token does not match this booking.")
        if payload.get("ground_id") != str(booking["ground_id"]):
            raise business_rule("QR_WRONG_GROUND", "QR token is for a different ground.")
        stored = booking.get("qr_token")
        if stored and stored != qr_token:
            raise business_rule("INVALID_QR_TOKEN", "QR token is invalid.")

    # Time window check
    try:
        slot_start = datetime.strptime(
            f"{booking['slot_date']} {booking['start_hour']:02d}:00", "%Y-%m-%d %H:%M"
        ).replace(tzinfo=timezone.utc)
    except Exception:
        raise validation_error("Booking slot timing is invalid.")
    now = utcnow()
    delta = abs((now - slot_start).total_seconds()) / 60.0
    if delta > settings.QR_SCAN_WINDOW_MINUTES:
        raise business_rule(
            "QR_OUTSIDE_TIME_WINDOW",
            f"Outside ±{settings.QR_SCAN_WINDOW_MINUTES} minute window for slot start.",
        )

    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "arrived", "arrived_at": now, "updated_at": now}},
    )
    booking = await db.bookings.find_one({"_id": booking["_id"]})
    return booking_to_out(booking)


async def complete_booking(
    db: AsyncIOMotorDatabase,
    manager: dict,
    booking_id: str,
    *,
    payment_method: str,
    amount_received: float,
) -> dict:
    booking = await db.bookings.find_one({"_id": to_oid(booking_id)})
    if not booking:
        raise not_found("Booking not found.")
    assignment = await db.manager_assignments.find_one(
        {"ground_id": booking["ground_id"], "manager_id": manager["_id"], "is_active": True}
    )
    if not assignment:
        raise forbidden("You are not assigned to this ground.")
    if booking.get("status") != "arrived":
        raise business_rule(
            "INVALID_BOOKING_STATE",
            "Booking must be in 'arrived' state before completion.",
        )
    now = utcnow()
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {
            "$set": {
                "status": "completed",
                "completion_payment_method": payment_method,
                "remainder_collected": amount_received,
                "updated_at": now,
            }
        },
    )
    booking = await db.bookings.find_one({"_id": booking["_id"]})
    notification_service.notify_in_background(
        notification_service.notify_booking_completed(db, booking)
    )
    return booking_to_out(booking)


def issue_qr_token(booking_id: str, ground_id: str) -> str:
    return create_qr_token(booking_id, ground_id)
