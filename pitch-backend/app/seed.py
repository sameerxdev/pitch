"""Seed the Mongo database with a small dev dataset.

Run inside the API container:

    docker compose exec api python -m app.seed

Wipes the seeded collections (users, grounds, slots, manager_assignments,
bookings, payments, reviews) and reinserts fresh data. OTP codes and refresh
tokens are left untouched.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from bson import ObjectId

from app.core.database import close_mongo, connect_mongo, get_db
from app.core.security import create_qr_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("seed")


WIPE_COLLECTIONS = [
    "users",
    "grounds",
    "slots",
    "manager_assignments",
    "bookings",
    "payments",
    "reviews",
]


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _today_iso() -> str:
    return _now().date().isoformat()


async def _wipe(db) -> None:
    for name in WIPE_COLLECTIONS:
        result = await db[name].delete_many({})
        logger.info("Cleared %s (%d docs)", name, result.deleted_count)


async def _seed_users(db) -> dict[str, dict]:
    now = _now()
    docs = [
        {
            "_id": ObjectId(),
            "phone": "+923000000001",
            "full_name": "Admin User",
            "role": "admin",
            "city": "Lahore",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000002",
            "full_name": "Ali Khan",
            "role": "ground_owner",
            "city": "Lahore",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000003",
            "full_name": "Bilal Ahmed",
            "role": "manager",
            "city": "Lahore",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000004",
            "full_name": "Hamza Sheikh",
            "role": "manager",
            "city": "Karachi",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000005",
            "full_name": "Usman Ali",
            "role": "player",
            "city": "Lahore",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000006",
            "full_name": "Hassan Raza",
            "role": "player",
            "city": "Lahore",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "phone": "+923000000007",
            "full_name": "Zain Iqbal",
            "role": "player",
            "city": "Karachi",
            "is_verified": True,
            "fcm_token": None,
            "created_at": now,
        },
    ]
    await db.users.insert_many(docs)
    logger.info("Inserted %d users", len(docs))
    return {u["phone"]: u for u in docs}


def _geo(longitude: float, latitude: float) -> dict:
    return {"type": "Point", "coordinates": [longitude, latitude]}


async def _seed_grounds(db, owner_id: ObjectId) -> list[dict]:
    now = _now()
    grounds = [
        {
            "_id": ObjectId(),
            "owner_id": owner_id,
            "name": "Champions Cricket Ground",
            "city": "Lahore",
            "area": "DHA Phase 5",
            "address": "DHA Phase 5, Sector C, Lahore",
            "latitude": 31.4697,
            "longitude": 74.4128,
            "location": _geo(74.4128, 31.4697),
            "hourly_rate_day": 2000.0,
            "hourly_rate_night": 3000.0,
            "advance_percent": 25,
            "facilities": ["Washrooms", "Floodlights", "Parking", "Cafeteria"],
            "photos": [
                "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200",
                "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200",
            ],
            "status": "active",
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": now,
            "updated_at": now,
        },
        {
            "_id": ObjectId(),
            "owner_id": owner_id,
            "name": "Seaview Sports Arena",
            "city": "Karachi",
            "area": "Clifton Block 2",
            "address": "Clifton Block 2, Karachi",
            "latitude": 24.8245,
            "longitude": 67.0301,
            "location": _geo(67.0301, 24.8245),
            "hourly_rate_day": 2500.0,
            "hourly_rate_night": 3500.0,
            "advance_percent": 20,
            "facilities": ["Washrooms", "Floodlights", "Parking", "Bats"],
            "photos": [
                "https://images.unsplash.com/photo-1593766788306-28561086694e?w=1200",
            ],
            "status": "active",
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": now,
            "updated_at": now,
        },
        {
            # Left unverified on purpose so the admin app has a ground to review.
            "_id": ObjectId(),
            "owner_id": owner_id,
            "name": "Model Town Turf Club",
            "city": "Lahore",
            "area": "Model Town Block B",
            "address": "Model Town Block B, Lahore",
            "latitude": 31.4805,
            "longitude": 74.3239,
            "location": _geo(74.3239, 31.4805),
            "hourly_rate_day": 1800.0,
            "hourly_rate_night": 2600.0,
            "advance_percent": 30,
            "facilities": ["Washrooms", "Parking"],
            "photos": [
                "https://images.unsplash.com/photo-1607734834519-d8576ae60ea6?w=1200",
            ],
            "status": "pending_verification",
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": now,
            "updated_at": now,
        },
    ]
    await db.grounds.insert_many(grounds)
    logger.info("Inserted %d grounds", len(grounds))
    return grounds


async def _seed_assignments(db, grounds: list[dict], managers: list[dict]) -> None:
    now = _now()
    docs = [
        {
            "_id": ObjectId(),
            "ground_id": grounds[0]["_id"],
            "manager_id": managers[0]["_id"],
            "manager_phone": managers[0]["phone"],
            "is_active": True,
            "assigned_at": now,
            "created_at": now,
        },
        {
            "_id": ObjectId(),
            "ground_id": grounds[1]["_id"],
            "manager_id": managers[1]["_id"],
            "manager_phone": managers[1]["phone"],
            "is_active": True,
            "assigned_at": now,
            "created_at": now,
        },
    ]
    await db.manager_assignments.insert_many(docs)
    logger.info("Inserted %d manager assignments", len(docs))


# Slot templates: 2-hour blocks covering morning/afternoon/evening/night.
SLOT_TEMPLATES = [
    {"start_hour": 8, "end_hour": 10, "rate_type": "day"},
    {"start_hour": 10, "end_hour": 12, "rate_type": "day"},
    {"start_hour": 14, "end_hour": 16, "rate_type": "day"},
    {"start_hour": 16, "end_hour": 18, "rate_type": "day"},
    {"start_hour": 18, "end_hour": 20, "rate_type": "night"},
    {"start_hour": 20, "end_hour": 22, "rate_type": "night"},
    {"start_hour": 22, "end_hour": 24, "rate_type": "night"},
]


async def _seed_slots(db, grounds: list[dict], days_ahead: int = 7) -> list[dict]:
    now = _now()
    today = _now().date()
    all_slots: list[dict] = []
    for ground in grounds:
        for offset in range(days_ahead):
            day = today + timedelta(days=offset)
            date_str = day.isoformat()
            for tpl in SLOT_TEMPLATES:
                hours = tpl["end_hour"] - tpl["start_hour"]
                rate = (
                    ground["hourly_rate_night"]
                    if tpl["rate_type"] == "night"
                    else ground["hourly_rate_day"]
                )
                all_slots.append(
                    {
                        "_id": ObjectId(),
                        "ground_id": ground["_id"],
                        "date": date_str,
                        "start_hour": tpl["start_hour"],
                        "end_hour": tpl["end_hour"],
                        "rate_type": tpl["rate_type"],
                        "price": hours * rate,
                        "status": "available",
                        "hold_expires_at": None,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
    await db.slots.insert_many(all_slots)
    logger.info("Inserted %d slots across %d grounds", len(all_slots), len(grounds))
    return all_slots


async def _seed_completed_booking(
    db,
    *,
    ground: dict,
    player: dict,
    slots: list[dict],
) -> None:
    """Create a completed booking on a past date so review submission is valid."""
    now = _now()
    past_date = (now - timedelta(days=2)).date().isoformat()
    # Past slot, marked booked so review flow is realistic.
    past_slot = {
        "_id": ObjectId(),
        "ground_id": ground["_id"],
        "date": past_date,
        "start_hour": 18,
        "end_hour": 20,
        "rate_type": "night",
        "price": 2 * ground["hourly_rate_night"],
        "status": "booked",
        "hold_expires_at": None,
        "created_at": now - timedelta(days=3),
        "updated_at": now - timedelta(days=2),
    }
    await db.slots.insert_one(past_slot)

    total = past_slot["price"]
    advance = round((total * ground["advance_percent"] / 100) / 10) * 10
    booking_id = ObjectId()
    qr_token = create_qr_token(str(booking_id), str(ground["_id"]))

    booking = {
        "_id": booking_id,
        "slot_id": past_slot["_id"],
        "player_id": player["_id"],
        "player_name": player.get("full_name"),
        "player_phone": player.get("phone"),
        "ground_id": ground["_id"],
        "ground_name": ground.get("name"),
        "ground_area": ground.get("area"),
        "slot_date": past_slot["date"],
        "start_hour": past_slot["start_hour"],
        "end_hour": past_slot["end_hour"],
        "status": "completed",
        "total_price": total,
        "advance_amount": advance,
        "qr_code": qr_token,
        "qr_token": qr_token,
        "arrived_at": now - timedelta(days=2, hours=-18),
        "completion_payment_method": "cash",
        "remainder_collected": total - advance,
        "review_submitted": True,
        "cancelled_at": None,
        "cancellation_reason": None,
        "hold_expires_at": None,
        "created_at": now - timedelta(days=3),
        "updated_at": now - timedelta(days=2),
    }
    await db.bookings.insert_one(booking)

    payment = {
        "_id": ObjectId(),
        "booking_id": booking_id,
        "player_id": player["_id"],
        "amount": advance,
        "method": "jazzcash",
        "status": "completed",
        "gateway_txn_id": "SEED-TXN-0001",
        "paid_at": now - timedelta(days=3),
        "refunded_at": None,
        "created_at": now - timedelta(days=3),
        "updated_at": now - timedelta(days=3),
    }
    await db.payments.insert_one(payment)

    review = {
        "_id": ObjectId(),
        "booking_id": booking_id,
        "ground_id": ground["_id"],
        "player_id": player["_id"],
        "player_name": player.get("full_name") or "Player",
        "overall_rating": 5,
        "rating_pitch": 5,
        "rating_cleanliness": 4,
        "rating_value": 5,
        "rating_manager": 5,
        "review_text": "Excellent ground and very well maintained. Floodlights are great!",
        "photos": [],
        "is_visible": True,
        "manager_reply": "Thanks for the kind words — see you again soon!",
        "manager_reply_at": now - timedelta(days=1),
        "created_at": now - timedelta(days=2),
        "updated_at": now - timedelta(days=1),
    }
    await db.reviews.insert_one(review)

    # Update ground rating.
    await db.grounds.update_one(
        {"_id": ground["_id"]},
        {"$set": {"avg_rating": 5.0, "review_count": 1}},
    )

    logger.info(
        "Inserted sample completed booking + payment + review on ground %s",
        ground["name"],
    )


async def main() -> None:
    await connect_mongo()
    db = get_db()
    try:
        await _wipe(db)
        users = await _seed_users(db)
        owner = users["+923000000002"]
        managers = [users["+923000000003"], users["+923000000004"]]
        players = [users["+923000000005"], users["+923000000006"], users["+923000000007"]]

        grounds = await _seed_grounds(db, owner["_id"])
        await _seed_assignments(db, grounds, managers)
        slots = await _seed_slots(db, grounds, days_ahead=7)
        await _seed_completed_booking(
            db, ground=grounds[0], player=players[0], slots=slots
        )

        logger.info("---- Seed complete ----")
        logger.info("Admin       : +923000000001 (any OTP if AUTH_BYPASS_OTP=true)")
        logger.info("Owner       : +923000000002  → owns %d grounds", len(grounds))
        logger.info("Manager #1  : +923000000003  → %s", grounds[0]["name"])
        logger.info("Manager #2  : +923000000004  → %s", grounds[1]["name"])
        logger.info("Players     : +923000000005, +923000000006, +923000000007")
        logger.info("Awaiting admin verification: %s", grounds[2]["name"])
    finally:
        await close_mongo()


if __name__ == "__main__":
    asyncio.run(main())
