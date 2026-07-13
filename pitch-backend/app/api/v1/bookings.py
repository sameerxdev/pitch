from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager, require_player
from app.core.envelope import success
from app.schemas.booking import (
    ArriveBookingBody,
    CompleteBookingBody,
    CreateBookingBody,
    CreateBookingResponse,
)
from app.services import booking_service
from app.services.serializers import booking_to_out

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("")
async def create_booking(
    body: CreateBookingBody,
    player=Depends(require_player),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    result = await booking_service.create_booking(db, player, body.slot_id, body.ground_id)
    return success(CreateBookingResponse(**result).model_dump())


@router.get("")
async def list_my_bookings(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    player=Depends(require_player),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await booking_service.list_my_bookings(
            db, player["_id"], status=status, limit=limit, offset=offset
        )
    )


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await booking_service.get_booking(db, booking_id, user=user)
    return success(booking_to_out(booking))


@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: str,
    player=Depends(require_player),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await booking_service.cancel_booking(db, player, booking_id))


@router.post("/{booking_id}/arrive")
async def arrive_booking(
    booking_id: str,
    body: ArriveBookingBody,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await booking_service.arrive_booking(
            db, manager, booking_id, method=body.method, qr_token=body.qr_token
        )
    )


@router.post("/{booking_id}/complete")
async def complete_booking(
    booking_id: str,
    body: CompleteBookingBody,
    manager=Depends(require_manager),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await booking_service.complete_booking(
            db,
            manager,
            booking_id,
            payment_method=body.payment_method,
            amount_received=body.amount_received,
        )
    )
