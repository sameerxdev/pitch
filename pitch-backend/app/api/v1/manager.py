from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import require_manager
from app.core.envelope import success
from app.schemas.slot import ApplySlotsBody, UpdateSlotBody
from app.services import ground_service, review_service, slot_service
from app.services.serializers import booking_to_out

router = APIRouter(prefix="/manager", tags=["manager"])


@router.get("/grounds")
async def list_assigned(
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    today = datetime.now(tz=timezone.utc).date().isoformat()
    cursor = db.manager_assignments.find({"manager_id": manager["_id"], "is_active": True})
    out = []
    async for assign in cursor:
        ground = await db.grounds.find_one({"_id": assign["ground_id"]})
        if not ground:
            continue
        count = await db.bookings.count_documents(
            {"ground_id": ground["_id"], "slot_date": today, "status": {"$nin": ["cancelled"]}}
        )
        out.append(
            {
                "id": str(ground["_id"]),
                "name": ground.get("name", ""),
                "area": ground.get("area", ""),
                "city": ground.get("city", ""),
                "today_booking_count": count,
            }
        )
    return success(out)


@router.get("/grounds/{ground_id}/slots")
async def list_slots(
    ground_id: str,
    date: Optional[str] = None,
    from_: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = None,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    slots = await slot_service.list_slots(db, ground_id, date_str=date, from_date=from_, to_date=to)
    return success(slots)


@router.patch("/grounds/{ground_id}/slots/{slot_id}")
async def update_slot(
    ground_id: str,
    slot_id: str,
    body: UpdateSlotBody,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    return success(await slot_service.update_slot(db, ground_id, slot_id, body))


@router.post("/grounds/{ground_id}/slots/apply")
async def apply_slots(
    ground_id: str,
    body: ApplySlotsBody,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    return success(await slot_service.apply_slots(db, ground_id, body))


@router.get("/grounds/{ground_id}/bookings")
async def list_bookings(
    ground_id: str,
    date: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    from app.utils.ids import to_oid

    filt: dict = {"ground_id": to_oid(ground_id)}
    if date:
        filt["slot_date"] = date
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if statuses:
            filt["status"] = {"$in": statuses}
    total = await db.bookings.count_documents(filt)
    cursor = (
        db.bookings.find(filt)
        .sort([("slot_date", 1), ("start_hour", 1)])
        .skip(offset)
        .limit(limit)
    )
    items = [booking_to_out(b) async for b in cursor]
    return success({"items": items, "total": total, "limit": limit, "offset": offset})


@router.get("/grounds/{ground_id}/bookings/{booking_id}")
async def booking_detail(
    ground_id: str,
    booking_id: str,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    from app.utils.ids import to_oid

    booking = await db.bookings.find_one(
        {"_id": to_oid(booking_id), "ground_id": to_oid(ground_id)}
    )
    if not booking:
        from app.core.exceptions import not_found
        raise not_found("Booking not found.")
    return success(booking_to_out(booking))


@router.get("/grounds/{ground_id}/reviews")
async def list_reviews(
    ground_id: str,
    sort: str = "newest",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_manager_for_ground(db, ground_id, manager["_id"])
    return success(
        await review_service.list_reviews_for_ground(
            db, ground_id, sort=sort, limit=limit, offset=offset, visible_only=False
        )
    )
