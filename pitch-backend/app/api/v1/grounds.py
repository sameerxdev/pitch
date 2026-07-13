from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.envelope import success
from app.services import ground_service, slot_service

router = APIRouter(prefix="/grounds", tags=["grounds"])


@router.get("")
async def list_grounds(
    search: Optional[str] = None,
    city: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_price: Optional[float] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    data = await ground_service.list_grounds_public(
        db,
        search=search,
        city=city,
        min_rating=min_rating,
        max_price=max_price,
        lat=lat,
        lng=lng,
        limit=limit,
        offset=offset,
    )
    return success(data)


@router.get("/{ground_id}")
async def ground_detail(
    ground_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    return success(await ground_service.get_ground_detail(db, ground_id, public=True))


@router.get("/{ground_id}/slots")
async def list_slots(
    ground_id: str,
    date: Optional[str] = None,
    from_: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    slots = await slot_service.list_slots(
        db,
        ground_id,
        date_str=date,
        from_date=from_,
        to_date=to,
        player_window=True,
    )
    return success(slots)


@router.get("/{ground_id}/reviews")
async def public_reviews(
    ground_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    from app.utils.ids import to_oid
    from app.services.serializers import review_to_out

    gid = to_oid(ground_id)
    filt = {"ground_id": gid, "is_visible": True}
    total = await db.reviews.count_documents(filt)
    cursor = db.reviews.find(filt).sort("created_at", -1).skip(offset).limit(limit)
    items = [review_to_out(r) async for r in cursor]
    return success({"items": items, "total": total, "limit": limit, "offset": offset})
