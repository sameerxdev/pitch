"""Close out bookings whose slot came and went without a check-in.

`no_show` is part of the booking status vocabulary but nothing produced it —
a confirmed booking the player never showed up for stayed `confirmed` forever,
which skews owner analytics and leaves the slot in `booked` indefinitely.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import utcnow

logger = logging.getLogger(__name__)

# How long after the slot ends before a confirmed-but-unscanned booking is
# written off. Generous enough that a late manual check-in still wins.
NO_SHOW_GRACE_HOURS = 2


def _slot_end(booking: dict) -> datetime | None:
    try:
        end_hour = int(booking["end_hour"])
        day = datetime.strptime(booking["slot_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except (KeyError, TypeError, ValueError):
        return None
    # end_hour of 24 means midnight of the following day.
    return day + timedelta(hours=end_hour)


async def mark_missed_bookings(db: AsyncIOMotorDatabase) -> int:
    """Flip `confirmed` bookings past their slot end + grace window to `no_show`."""
    now = utcnow()
    cutoff_date = (now - timedelta(hours=NO_SHOW_GRACE_HOURS)).date().isoformat()
    # Date-level prefilter keeps the scan small; the exact hour check follows.
    cursor = db.bookings.find({"status": "confirmed", "slot_date": {"$lte": cutoff_date}})

    marked = 0
    async for booking in cursor:
        end = _slot_end(booking)
        if end is None or now < end + timedelta(hours=NO_SHOW_GRACE_HOURS):
            continue
        result = await db.bookings.update_one(
            {"_id": booking["_id"], "status": "confirmed"},
            {"$set": {"status": "no_show", "updated_at": now}},
        )
        if result.modified_count:
            marked += 1
            # The slot is in the past, so releasing it back to `available`
            # would only make expired slots look bookable in listings.
    return marked
