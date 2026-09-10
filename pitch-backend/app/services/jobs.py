from __future__ import annotations

import asyncio
import logging

from app.core.database import get_db
from app.services.slot_service import release_expired_holds
from app.services.no_show_service import mark_missed_bookings

logger = logging.getLogger(__name__)


async def hold_expiry_loop(interval_seconds: int = 60) -> None:
    """Release expired slot holds, then write off bookings nobody showed up for."""
    while True:
        try:
            db = get_db()
            released = await release_expired_holds(db)
            if released:
                logger.info("Released %d expired slot holds", released)
            missed = await mark_missed_bookings(db)
            if missed:
                logger.info("Marked %d bookings as no_show", missed)
        except Exception as exc:  # noqa: BLE001
            logger.exception("hold_expiry_loop failed: %s", exc)
        await asyncio.sleep(interval_seconds)
