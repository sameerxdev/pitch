from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_owner
from app.core.envelope import success
from app.core.exceptions import validation_error
from app.schemas.ground import (
    ALLOWED_FACILITIES,
    CreateGroundBody,
    UpdateGroundBody,
)
from app.schemas.owner import AssignManagerBody
from app.schemas.slot import ApplySlotsBody, UpdateSlotBody
from app.services import ground_service, owner_service, review_service, slot_service
from app.utils.files import save_images

router = APIRouter(prefix="/owner", tags=["owner"])


# ---- Grounds ----------------------------------------------------------------

@router.get("/grounds")
async def list_my_grounds(
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await ground_service.list_owner_grounds(db, owner["_id"]))


def _parse_facilities(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(x) for x in parsed]
    except json.JSONDecodeError:
        pass
    return [v.strip() for v in raw.split(",") if v.strip()]


@router.post("/grounds")
async def create_ground(
    name: str = Form(...),
    city: str = Form(...),
    area: str = Form(...),
    address: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    hourly_rate_day: float = Form(...),
    hourly_rate_night: float = Form(...),
    advance_percent: int = Form(...),
    facilities: Optional[str] = Form(default=None),
    photos: Optional[List[UploadFile]] = File(default=None),
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    facility_list = _parse_facilities(facilities)
    unknown = set(facility_list) - ALLOWED_FACILITIES
    if unknown:
        raise validation_error(f"Unknown facilities: {sorted(unknown)}")
    body = CreateGroundBody(
        name=name,
        city=city,
        area=area,
        address=address,
        latitude=latitude,
        longitude=longitude,
        hourly_rate_day=hourly_rate_day,
        hourly_rate_night=hourly_rate_night,
        advance_percent=advance_percent,
        facilities=facility_list,
    ).model_dump()

    urls: List[str] = []
    if photos:
        urls = await save_images(photos, max_count=settings.MAX_GROUND_PHOTOS, subdir="grounds")
    return success(await ground_service.create_ground(db, owner["_id"], body, urls))


@router.patch("/grounds/{ground_id}")
async def update_ground(
    ground_id: str,
    body: UpdateGroundBody,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await ground_service.update_ground(
            db, owner["_id"], ground_id, body.model_dump(exclude_unset=True)
        )
    )


@router.get("/grounds/{ground_id}")
async def ground_detail(
    ground_id: str,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Owner-scoped detail — unlike the public route this also serves grounds
    that are still pending verification, inactive, or suspended."""
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(await ground_service.get_ground_detail(db, ground_id, public=False))


# ---- Slots ------------------------------------------------------------------

@router.get("/grounds/{ground_id}/slots")
async def list_slots(
    ground_id: str,
    date: Optional[str] = None,
    from_: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = None,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(
        await slot_service.list_slots(db, ground_id, date_str=date, from_date=from_, to_date=to)
    )


@router.patch("/grounds/{ground_id}/slots/{slot_id}")
async def update_slot(
    ground_id: str,
    slot_id: str,
    body: UpdateSlotBody,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(await slot_service.update_slot(db, ground_id, slot_id, body))


@router.post("/grounds/{ground_id}/slots/apply")
async def apply_slots(
    ground_id: str,
    body: ApplySlotsBody,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(await slot_service.apply_slots(db, ground_id, body))


# ---- Managers ---------------------------------------------------------------

@router.get("/grounds/{ground_id}/managers")
async def list_managers(
    ground_id: str,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(await owner_service.list_assignments(db, ground_id))


@router.post("/grounds/{ground_id}/managers")
async def assign_manager(
    ground_id: str,
    body: AssignManagerBody,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(await owner_service.assign_manager(db, ground_id, body.phone))


@router.delete("/grounds/{ground_id}/managers/{manager_id}")
async def remove_manager(
    ground_id: str,
    manager_id: str,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    await owner_service.remove_manager(db, ground_id, manager_id)
    return success(None)


# ---- Analytics --------------------------------------------------------------

@router.get("/analytics")
async def analytics(
    period: str = Query(..., pattern="^(today|week|month)$"),
    ground_id: Optional[str] = None,
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await owner_service.get_analytics(db, owner["_id"], period=period, ground_id=ground_id))


# ---- Reviews ----------------------------------------------------------------

@router.get("/grounds/{ground_id}/reviews")
async def list_reviews(
    ground_id: str,
    sort: str = "newest",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    owner=Depends(require_owner),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await ground_service.assert_owner(db, ground_id, owner["_id"])
    return success(
        await review_service.list_reviews_for_ground(
            db, ground_id, sort=sort, limit=limit, offset=offset, visible_only=False
        )
    )
