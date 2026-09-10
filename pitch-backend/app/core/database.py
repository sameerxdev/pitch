from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import GEOSPHERE
from pymongo.errors import OperationFailure

from app.core.config import settings


class MongoState:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongo = MongoState()


async def connect_mongo() -> None:
    mongo.client = AsyncIOMotorClient(settings.MONGO_URI, uuidRepresentation="standard")
    mongo.db = mongo.client[settings.MONGO_DB]
    await ensure_indexes()
    await backfill_ground_locations()


async def close_mongo() -> None:
    if mongo.client is not None:
        mongo.client.close()
        mongo.client = None
        mongo.db = None


def get_db() -> AsyncIOMotorDatabase:
    if mongo.db is None:
        raise RuntimeError("MongoDB is not initialized")
    return mongo.db


async def _drop_index_if_exists(collection, name: str) -> None:
    """Drop a legacy index so a redefined one can be created in its place."""
    try:
        existing = await collection.index_information()
    except OperationFailure:
        return
    if name in existing:
        await collection.drop_index(name)


async def backfill_ground_locations() -> None:
    """Give pre-existing grounds the GeoJSON `location` the 2dsphere index needs.

    Grounds are stored with flat latitude/longitude; `location` is derived so
    $geoNear can sort by distance. New/updated grounds get it written inline.
    """
    db = get_db()
    cursor = db.grounds.find(
        {"location": {"$exists": False}, "latitude": {"$ne": None}, "longitude": {"$ne": None}},
        {"latitude": 1, "longitude": 1},
    )
    async for ground in cursor:
        await db.grounds.update_one(
            {"_id": ground["_id"]},
            {"$set": {"location": to_geojson(ground["longitude"], ground["latitude"])}},
        )


def to_geojson(longitude: float, latitude: float) -> dict:
    """GeoJSON Point — note the [lng, lat] ordering Mongo expects."""
    return {"type": "Point", "coordinates": [float(longitude), float(latitude)]}


async def ensure_indexes() -> None:
    db = get_db()
    # Superseded by the partial variant below; drop before recreating.
    await _drop_index_if_exists(db.manager_assignments, "ground_id_1_manager_id_1")

    await db.users.create_index("phone", unique=True)
    await db.users.create_index("role")

    await db.grounds.create_index("owner_id")
    await db.grounds.create_index([("status", 1), ("city", 1)])
    await db.grounds.create_index("name")
    # Powers distance sorting on GET /grounds?lat=&lng= (see ground_service).
    await db.grounds.create_index([("location", GEOSPHERE)])

    await db.slots.create_index([("ground_id", 1), ("date", 1), ("start_hour", 1)], unique=True)
    await db.slots.create_index([("ground_id", 1), ("date", 1), ("status", 1)])
    await db.slots.create_index("hold_expires_at", sparse=True)

    await db.bookings.create_index([("player_id", 1), ("created_at", -1)])
    await db.bookings.create_index([("ground_id", 1), ("slot_date", 1), ("status", 1)])
    await db.bookings.create_index("slot_id")
    await db.bookings.create_index("qr_token", unique=True, sparse=True)

    await db.payments.create_index("booking_id")
    await db.payments.create_index("gateway_txn_id", sparse=True)

    await db.reviews.create_index("booking_id", unique=True)
    await db.reviews.create_index([("ground_id", 1), ("created_at", -1)])

    # Partial so several phone-only invites (manager_id: null) can coexist on one
    # ground; uniqueness still holds once each invite resolves to a real user.
    await db.manager_assignments.create_index(
        [("ground_id", 1), ("manager_id", 1)],
        unique=True,
        partialFilterExpression={"manager_id": {"$type": "objectId"}},
        name="ground_manager_unique",
    )
    await db.manager_assignments.create_index([("ground_id", 1), ("manager_phone", 1)])
    await db.manager_assignments.create_index("manager_id")

    await db.otp_codes.create_index("phone")
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)

    # Sliding-window counters for /auth/request-otp throttling.
    await db.otp_requests.create_index([("phone", 1), ("created_at", -1)])
    await db.otp_requests.create_index("expires_at", expireAfterSeconds=0)

    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index("user_id")
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
