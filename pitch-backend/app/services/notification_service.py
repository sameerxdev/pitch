"""Outbound push notifications.

The mobile app registers an **Expo** push token (`expo-notifications`) through
`PATCH /users/me`, so sends go to Expo's push service, which fans out to
FCM/APNs. Nothing here is allowed to break a booking flow: every send is
best-effort and swallows its own errors.

This module is a leaf — it imports only the db handle and settings, so the
business services can call it without creating a dependency cycle.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Iterable, Optional

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)

# Expo tokens look like ExponentPushToken[xxxxxxxx] / ExpoPushToken[...].
_EXPO_PREFIXES = ("ExponentPushToken[", "ExpoPushToken[")


def _is_expo_token(token: Optional[str]) -> bool:
    return bool(token) and token.startswith(_EXPO_PREFIXES)


async def _post_messages(messages: list[dict[str, Any]]) -> None:
    if not messages:
        return
    try:
        async with httpx.AsyncClient(timeout=settings.PUSH_TIMEOUT_SECONDS) as client:
            response = await client.post(
                settings.EXPO_PUSH_URL,
                json=messages,
                headers={"accept": "application/json", "content-type": "application/json"},
            )
        if response.status_code >= 400:
            logger.warning("Expo push rejected (%s): %s", response.status_code, response.text[:500])
    except Exception as exc:  # noqa: BLE001 — never surface push failures to the caller
        logger.warning("Expo push send failed: %s", exc)


async def _tokens_for_users(db: AsyncIOMotorDatabase, user_ids: Iterable[ObjectId]) -> list[str]:
    ids = [uid for uid in user_ids if uid is not None]
    if not ids:
        return []
    cursor = db.users.find({"_id": {"$in": ids}, "fcm_token": {"$ne": None}}, {"fcm_token": 1})
    return [u["fcm_token"] async for u in cursor if _is_expo_token(u.get("fcm_token"))]


async def notify_users(
    db: AsyncIOMotorDatabase,
    user_ids: Iterable[ObjectId],
    *,
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
) -> None:
    """Send one notification to every user in `user_ids` that has a push token."""
    if not settings.PUSH_ENABLED:
        return
    tokens = await _tokens_for_users(db, user_ids)
    if not tokens:
        return
    await _post_messages(
        [
            {"to": token, "title": title, "body": body, "data": data or {}, "sound": "default"}
            for token in tokens
        ]
    )


def notify_in_background(coro) -> None:
    """Fire a notify_* coroutine without making the caller wait on the network."""
    task = asyncio.create_task(coro)
    # Keep a reference so the task isn't garbage-collected mid-flight, and make
    # sure a failure inside it never becomes an unretrieved-exception warning.
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


_background_tasks: set[asyncio.Task] = set()


# ---- Ground staff lookup ----------------------------------------------------

async def _ground_staff_ids(db: AsyncIOMotorDatabase, ground_id: ObjectId) -> list[ObjectId]:
    """Owner + every active manager assigned to a ground."""
    ids: list[ObjectId] = []
    ground = await db.grounds.find_one({"_id": ground_id}, {"owner_id": 1})
    if ground and ground.get("owner_id"):
        ids.append(ground["owner_id"])
    cursor = db.manager_assignments.find(
        {"ground_id": ground_id, "is_active": True, "manager_id": {"$ne": None}},
        {"manager_id": 1},
    )
    async for assignment in cursor:
        ids.append(assignment["manager_id"])
    return ids


# ---- Domain events ----------------------------------------------------------

def _slot_label(booking: dict) -> str:
    return f"{booking.get('slot_date', '')} {booking.get('start_hour', 0)}:00"


async def notify_booking_confirmed(db: AsyncIOMotorDatabase, booking: dict) -> None:
    """Payment cleared — tell the player, and give the ground staff a heads-up."""
    await notify_users(
        db,
        [booking["player_id"]],
        title="Booking confirmed ✅",
        body=f"{booking.get('ground_name', 'Your ground')} · {_slot_label(booking)}. Your QR code is ready.",
        data={"type": "booking_confirmed", "booking_id": str(booking["_id"])},
    )
    await notify_users(
        db,
        await _ground_staff_ids(db, booking["ground_id"]),
        title="New booking",
        body=f"{booking.get('player_name') or 'A player'} booked {_slot_label(booking)}.",
        data={"type": "booking_created", "booking_id": str(booking["_id"])},
    )


async def notify_booking_cancelled(db: AsyncIOMotorDatabase, booking: dict, reason: str) -> None:
    await notify_users(
        db,
        [booking["player_id"]],
        title="Booking cancelled",
        body=f"{booking.get('ground_name', 'Your booking')} · {_slot_label(booking)}. {reason}",
        data={"type": "booking_cancelled", "booking_id": str(booking["_id"])},
    )
    await notify_users(
        db,
        await _ground_staff_ids(db, booking["ground_id"]),
        title="Booking cancelled",
        body=f"{_slot_label(booking)} is free again.",
        data={"type": "booking_cancelled", "booking_id": str(booking["_id"])},
    )


async def notify_booking_completed(db: AsyncIOMotorDatabase, booking: dict) -> None:
    await notify_users(
        db,
        [booking["player_id"]],
        title="Thanks for playing! 🏏",
        body=f"How was {booking.get('ground_name', 'the ground')}? Leave a review from your bookings.",
        data={"type": "booking_completed", "booking_id": str(booking["_id"])},
    )


async def notify_manager_assigned(db: AsyncIOMotorDatabase, manager_id: ObjectId, ground_name: str) -> None:
    await notify_users(
        db,
        [manager_id],
        title="You're now a ground manager",
        body=f"You've been assigned to {ground_name}. Log in to manage bookings.",
        data={"type": "manager_assigned"},
    )


async def notify_ground_status(db: AsyncIOMotorDatabase, ground: dict, status: str, reason: Optional[str]) -> None:
    """Admin verified / rejected / suspended a ground — tell its owner."""
    titles = {
        "active": "Ground approved ✅",
        "suspended": "Ground suspended",
        "inactive": "Ground deactivated",
        "pending_verification": "Ground under review",
    }
    body = f"{ground.get('name', 'Your ground')} is now {status.replace('_', ' ')}."
    if reason:
        body = f"{body} {reason}"
    await notify_users(
        db,
        [ground["owner_id"]],
        title=titles.get(status, "Ground updated"),
        body=body,
        data={"type": "ground_status", "ground_id": str(ground["_id"]), "status": status},
    )


async def notify_review_reply(db: AsyncIOMotorDatabase, review: dict, ground_name: str) -> None:
    await notify_users(
        db,
        [review["player_id"]],
        title="The ground replied to your review",
        body=f"{ground_name} responded to your feedback.",
        data={"type": "review_reply", "review_id": str(review["_id"])},
    )
