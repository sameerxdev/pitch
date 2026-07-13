from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _s(v: Any) -> Any:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return iso(v)
    return v


def user_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "phone": doc["phone"],
        "full_name": doc.get("full_name"),
        "role": doc.get("role", "player"),
        "city": doc.get("city"),
        "is_verified": doc.get("is_verified", False),
        "fcm_token": doc.get("fcm_token"),
        "created_at": iso(doc.get("created_at")) or iso(datetime.now(tz=timezone.utc)),
    }


def ground_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "owner_id": str(doc["owner_id"]),
        "name": doc["name"],
        "city": doc["city"],
        "area": doc["area"],
        "address": doc["address"],
        "latitude": doc["latitude"],
        "longitude": doc["longitude"],
        "hourly_rate_day": doc["hourly_rate_day"],
        "hourly_rate_night": doc["hourly_rate_night"],
        "advance_percent": doc["advance_percent"],
        "avg_rating": doc.get("avg_rating", 0.0),
        "review_count": doc.get("review_count", 0),
        "status": doc.get("status", "pending_verification"),
        "photos": doc.get("photos", []),
        "facilities": doc.get("facilities", []),
        "created_at": iso(doc.get("created_at")),
    }


def slot_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "ground_id": str(doc["ground_id"]),
        "date": doc["date"],
        "start_hour": doc["start_hour"],
        "end_hour": doc["end_hour"],
        "status": doc.get("status", "available"),
        "rate_type": doc.get("rate_type", "day"),
        "price": doc.get("price", 0),
        "hold_expires_at": iso(doc.get("hold_expires_at")),
    }


def booking_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "slot_id": str(doc["slot_id"]),
        "player_id": str(doc["player_id"]),
        "player_name": doc.get("player_name"),
        "player_phone": doc.get("player_phone"),
        "ground_id": str(doc["ground_id"]),
        "ground_name": doc.get("ground_name", ""),
        "ground_area": doc.get("ground_area", ""),
        "slot_date": doc.get("slot_date", ""),
        "start_hour": doc.get("start_hour", 0),
        "end_hour": doc.get("end_hour", 0),
        "status": doc.get("status", "on_hold"),
        "total_price": doc.get("total_price", 0),
        "advance_amount": doc.get("advance_amount", 0),
        "qr_code": doc.get("qr_code"),
        "arrived_at": iso(doc.get("arrived_at")),
        "completion_payment_method": doc.get("completion_payment_method"),
        "remainder_collected": doc.get("remainder_collected", 0),
        "review_submitted": doc.get("review_submitted", False),
        "cancelled_at": iso(doc.get("cancelled_at")),
        "cancellation_reason": doc.get("cancellation_reason"),
        "created_at": iso(doc.get("created_at")),
    }


def review_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "booking_id": str(doc["booking_id"]),
        "ground_id": str(doc["ground_id"]),
        "player_id": str(doc["player_id"]),
        "player_name": doc.get("player_name", ""),
        "overall_rating": doc.get("overall_rating", 0),
        "rating_pitch": doc.get("rating_pitch"),
        "rating_cleanliness": doc.get("rating_cleanliness"),
        "rating_value": doc.get("rating_value"),
        "rating_manager": doc.get("rating_manager"),
        "review_text": doc.get("review_text"),
        "photos": doc.get("photos", []),
        "is_visible": doc.get("is_visible", True),
        "manager_reply": doc.get("manager_reply"),
        "manager_reply_at": iso(doc.get("manager_reply_at")),
        "created_at": iso(doc.get("created_at")),
    }


def payment_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "booking_id": str(doc["booking_id"]),
        "player_id": str(doc["player_id"]),
        "amount": doc.get("amount", 0),
        "method": doc.get("method"),
        "status": doc.get("status", "pending"),
        "gateway_txn_id": doc.get("gateway_txn_id"),
        "paid_at": iso(doc.get("paid_at")),
        "refunded_at": iso(doc.get("refunded_at")),
    }


def assignment_to_out(assignment: dict, ground: dict, manager: Optional[dict]) -> dict:
    return {
        "id": str(assignment["_id"]),
        "ground_id": str(ground["_id"]),
        "ground_name": ground.get("name", ""),
        "ground_area": ground.get("area", ""),
        "ground_city": ground.get("city", ""),
        "manager_id": str(assignment["manager_id"]),
        "manager_name": (manager or {}).get("full_name") if manager else None,
        "manager_phone": (manager or {}).get("phone", ""),
        "is_active": assignment.get("is_active", True),
        "assigned_at": iso(assignment.get("assigned_at")),
    }
