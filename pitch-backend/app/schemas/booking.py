from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

BookingStatus = Literal["on_hold", "confirmed", "arrived", "completed", "cancelled", "no_show"]


class CreateBookingBody(BaseModel):
    slot_id: str
    ground_id: str


class CreateBookingResponse(BaseModel):
    booking_id: str
    advance_amount: float
    total_price: float
    hold_expires_at: str


class BookingOut(BaseModel):
    id: str
    slot_id: str
    player_id: str
    player_name: Optional[str] = None
    player_phone: Optional[str] = None
    ground_id: str
    ground_name: str
    ground_area: str
    slot_date: str
    start_hour: int
    end_hour: int
    status: BookingStatus
    total_price: float
    advance_amount: float
    qr_code: Optional[str] = None
    arrived_at: Optional[str] = None
    completion_payment_method: Optional[Literal["cash", "bank_transfer"]] = None
    remainder_collected: float = 0
    review_submitted: bool = False
    cancelled_at: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: str


class ArriveBookingBody(BaseModel):
    method: Literal["qr", "manual"]
    qr_token: Optional[str] = None


class CompleteBookingBody(BaseModel):
    payment_method: Literal["cash", "bank_transfer"]
    amount_received: float = Field(..., ge=0)
