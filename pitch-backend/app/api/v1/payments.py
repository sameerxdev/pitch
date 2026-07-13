from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_player
from app.core.envelope import success
from app.schemas.payment import InitiatePaymentBody, InitiatePaymentResponse, WebhookBody
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/initiate")
async def initiate(
    body: InitiatePaymentBody,
    player=Depends(require_player),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    result = await payment_service.initiate_payment(db, player, body.booking_id, body.method)
    return success(InitiatePaymentResponse(**result).model_dump())


@router.get("/{payment_id}")
async def status(
    payment_id: str,
    user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await payment_service.get_payment(db, payment_id, user=user))


@router.post("/webhooks/jazzcash")
async def webhook_jazzcash(body: WebhookBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    # Signature verification placeholder — wire to JazzCash's docs in production.
    if body.status == "completed":
        return success(await payment_service.mark_payment_completed(db, body.payment_id, body.gateway_txn_id))
    if body.status == "failed":
        return success(await payment_service.mark_payment_failed(db, body.payment_id))
    return success(None)


@router.post("/webhooks/easypaisa")
async def webhook_easypaisa(body: WebhookBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    if body.status == "completed":
        return success(await payment_service.mark_payment_completed(db, body.payment_id, body.gateway_txn_id))
    if body.status == "failed":
        return success(await payment_service.mark_payment_failed(db, body.payment_id))
    return success(None)
