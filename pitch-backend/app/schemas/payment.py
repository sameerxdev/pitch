from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

PaymentMethod = Literal["jazzcash", "easypaisa"]
PaymentStatus = Literal["pending", "completed", "failed", "refunded"]


class InitiatePaymentBody(BaseModel):
    booking_id: str
    method: PaymentMethod


class InitiatePaymentResponse(BaseModel):
    payment_url: str
    payment_id: str


class PaymentOut(BaseModel):
    id: str
    booking_id: str
    player_id: str
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    gateway_txn_id: Optional[str] = None
    paid_at: Optional[str] = None
    refunded_at: Optional[str] = None


class WebhookBody(BaseModel):
    payment_id: str
    gateway_txn_id: Optional[str] = None
    status: PaymentStatus
    signature: Optional[str] = None
