from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.core.envelope import success
from app.schemas.admin import (
    ModerateReviewBody,
    UpdateGroundStatusBody,
    UpdateUserBody,
    VerifyGroundBody,
)
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ---- Analytics --------------------------------------------------------------

@router.get("/analytics")
async def platform_analytics(
    period: str = Query("week", pattern="^(today|week|month)$"),
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await admin_service.get_platform_analytics(db, period=period))


# ---- Grounds ----------------------------------------------------------------

@router.get("/grounds")
async def list_grounds(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await admin_service.list_grounds(
            db, status=status, search=search, limit=limit, offset=offset
        )
    )


@router.patch("/grounds/{ground_id}/verify")
async def verify_ground(
    ground_id: str,
    body: VerifyGroundBody,
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve a pending ground (→ active) or reject it (→ inactive, with reason)."""
    return success(
        await admin_service.set_ground_status(
            db,
            ground_id,
            status="active" if body.approve else "inactive",
            reason=body.reason,
        )
    )


@router.patch("/grounds/{ground_id}")
async def update_ground_status(
    ground_id: str,
    body: UpdateGroundStatusBody,
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await admin_service.set_ground_status(db, ground_id, status=body.status, reason=body.reason)
    )


# ---- Users ------------------------------------------------------------------

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await admin_service.list_users(db, role=role, search=search, limit=limit, offset=offset)
    )


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserBody,
    admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await admin_service.update_user(
            db, admin, user_id, role=body.role, is_suspended=body.is_suspended
        )
    )


# ---- Review moderation ------------------------------------------------------

@router.get("/reviews")
async def list_reviews(
    ground_id: Optional[str] = None,
    visible: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(
        await admin_service.list_reviews(
            db, ground_id=ground_id, visible=visible, limit=limit, offset=offset
        )
    )


@router.patch("/reviews/{review_id}")
async def moderate_review(
    review_id: str,
    body: ModerateReviewBody,
    _admin=Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await admin_service.set_review_visibility(db, review_id, is_visible=body.is_visible))
