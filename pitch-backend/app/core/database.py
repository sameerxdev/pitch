from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoState:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongo = MongoState()


async def connect_mongo() -> None:
    mongo.client = AsyncIOMotorClient(settings.MONGO_URI, uuidRepresentation="standard")
    mongo.db = mongo.client[settings.MONGO_DB]
    await ensure_indexes()


async def close_mongo() -> None:
    if mongo.client is not None:
        mongo.client.close()
        mongo.client = None
        mongo.db = None


def get_db() -> AsyncIOMotorDatabase:
    if mongo.db is None:
        raise RuntimeError("MongoDB is not initialized")
    return mongo.db


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("phone", unique=True)
    await db.users.create_index("role")

    await db.grounds.create_index("owner_id")
    await db.grounds.create_index([("status", 1), ("city", 1)])
    await db.grounds.create_index("name")

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

    await db.manager_assignments.create_index([("ground_id", 1), ("manager_id", 1)], unique=True)
    await db.manager_assignments.create_index("manager_id")

    await db.otp_codes.create_index("phone")
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)

    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index("user_id")
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
