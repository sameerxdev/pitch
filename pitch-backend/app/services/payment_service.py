from __future__ import annotations

from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.exceptions import business_rule, forbidden, not_found
from app.core.security import utcnow
from app.services import notification_service
from app.services.booking_service import issue_qr_token
from app.services.serializers import payment_to_out
from app.utils.ids import to_oid


async def initiate_payment(
    db: AsyncIOMotorDatabase,
    player: dict,
    booking_id: str,
    method: str,
) -> dict:
    booking = await db.bookings.find_one({"_id": to_oid(booking_id)})
    if not booking:
        raise not_found("Booking not found.")
    if booking["player_id"] != player["_id"]:
        raise forbidden("Not your booking.")
    if booking.get("status") != "on_hold":
        raise business_rule("INVALID_BOOKING_STATE", "Payment can only be initiated for held bookings.")

    now = utcnow()
    doc = {
        "booking_id": booking["_id"],
        "player_id": player["_id"],
        "amount": float(booking.get("advance_amount", 0)),
        "method": method,
        "status": "pending",
        "gateway_txn_id": None,
        "paid_at": None,
        "refunded_at": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.payments.insert_one(doc)
    payment_id = str(result.inserted_id)

    # In a real impl this would hit JazzCash/Easypaisa; here we return a deep link
    # that the gateway would redirect to. The mobile client polls `GET /payments/{id}`.
    payment_url = f"https://gateway.example.local/{method}/pay/{payment_id}"

    # Dev shortcut: settle the payment immediately so the polling client succeeds
    # without a real gateway webhook. Disable in production by setting
    # PAYMENT_AUTO_COMPLETE=false.
    if settings.PAYMENT_AUTO_COMPLETE:
        await mark_payment_completed(db, payment_id, f"DEV-AUTOCOMPLETE-{payment_id[-6:]}")

    return {"payment_url": payment_url, "payment_id": payment_id}


async def get_payment(db: AsyncIOMotorDatabase, payment_id: str, *, user: dict) -> dict:
    payment = await db.payments.find_one({"_id": to_oid(payment_id)})
    if not payment:
        raise not_found("Payment not found.")
    if user.get("role") == "player" and payment["player_id"] != user["_id"]:
        raise forbidden("Not your payment.")
    return payment_to_out(payment)


async def mark_payment_completed(
    db: AsyncIOMotorDatabase,
    payment_id: str,
    gateway_txn_id: Optional[str],
) -> dict:
    payment = await db.payments.find_one({"_id": to_oid(payment_id)})
    if not payment:
        raise not_found("Payment not found.")
    if payment.get("status") == "completed":
        return payment_to_out(payment)

    now = utcnow()
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": "completed", "gateway_txn_id": gateway_txn_id, "paid_at": now, "updated_at": now}},
    )
    booking = await db.bookings.find_one({"_id": payment["booking_id"]})
    if booking and booking.get("status") == "on_hold":
        qr_token = issue_qr_token(str(booking["_id"]), str(booking["ground_id"]))
        await db.bookings.update_one(
            {"_id": booking["_id"]},
            {
                "$set": {
                    "status": "confirmed",
                    "qr_code": qr_token,
                    "qr_token": qr_token,
                    "hold_expires_at": None,
                    "updated_at": now,
                }
            },
        )
        await db.slots.update_one(
            {"_id": booking["slot_id"]},
            {"$set": {"status": "booked", "hold_expires_at": None, "updated_at": now}},
        )
        notification_service.notify_in_background(
            notification_service.notify_booking_confirmed(db, booking)
        )

    payment = await db.payments.find_one({"_id": payment["_id"]})
    return payment_to_out(payment)


async def mark_payment_failed(db: AsyncIOMotorDatabase, payment_id: str) -> dict:
    payment = await db.payments.find_one({"_id": to_oid(payment_id)})
    if not payment:
        raise not_found("Payment not found.")
    now = utcnow()
    await db.payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {"status": "failed", "updated_at": now}},
    )
    payment = await db.payments.find_one({"_id": payment["_id"]})
    return payment_to_out(payment)
