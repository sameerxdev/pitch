from __future__ import annotations

import asyncio
import logging

from app.core.database import get_db
from app.services.slot_service import release_expired_holds

logger = logging.getLogger(__name__)


async def hold_expiry_loop(interval_seconds: int = 60) -> None:
    """Run periodically to release expired slot holds and cancel their bookings."""
    while True:
        try:
            db = get_db()
            released = await release_expired_holds(db)
            if released:
                logger.info("Released %d expired slot holds", released)
        except Exception as exc:  # noqa: BLE001
            logger.exception("hold_expiry_loop failed: %s", exc)
        await asyncio.sleep(interval_seconds)
