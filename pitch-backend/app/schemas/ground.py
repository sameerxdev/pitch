from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

GroundStatus = Literal["pending_verification", "active", "inactive", "suspended"]

ALLOWED_FACILITIES = {"Washrooms", "Floodlights", "Parking", "Cafeteria", "Bats"}


class GroundOut(BaseModel):
    id: str
    owner_id: str
    name: str
    city: str
    area: str
    address: str
    latitude: float
    longitude: float
    hourly_rate_day: float
    hourly_rate_night: float
    advance_percent: int
    avg_rating: float = 0.0
    review_count: int = 0
    status: GroundStatus
    photos: List[str] = Field(default_factory=list)
    facilities: List[str] = Field(default_factory=list)
    created_at: str


class CreateGroundBody(BaseModel):
    name: str = Field(..., min_length=3, max_length=120)
    city: str = Field(..., min_length=2, max_length=80)
    area: str = Field(..., min_length=2, max_length=120)
    address: str = Field(..., min_length=2, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    hourly_rate_day: float = Field(..., ge=100)
    hourly_rate_night: float = Field(..., ge=100)
    advance_percent: int = Field(..., ge=10, le=50)
    facilities: List[str] = Field(default_factory=list)

    @field_validator("facilities")
    @classmethod
    def _v_facilities(cls, v: List[str]) -> List[str]:
        unknown = set(v) - ALLOWED_FACILITIES
        if unknown:
            raise ValueError(f"Unknown facilities: {sorted(unknown)}")
        return list(dict.fromkeys(v))


class UpdateGroundBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=3, max_length=120)
    city: Optional[str] = Field(default=None, min_length=2, max_length=80)
    area: Optional[str] = Field(default=None, min_length=2, max_length=120)
    address: Optional[str] = Field(default=None, min_length=2, max_length=255)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    hourly_rate_day: Optional[float] = Field(default=None, ge=100)
    hourly_rate_night: Optional[float] = Field(default=None, ge=100)
    advance_percent: Optional[int] = Field(default=None, ge=10, le=50)
    facilities: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @field_validator("facilities")
    @classmethod
    def _v_facilities(cls, v):
        if v is None:
            return v
        unknown = set(v) - ALLOWED_FACILITIES
        if unknown:
            raise ValueError(f"Unknown facilities: {sorted(unknown)}")
        return list(dict.fromkeys(v))


class GroundDetailOut(GroundOut):
    latest_reviews: list = Field(default_factory=list)


class ManagerGroundOut(BaseModel):
    id: str
    name: str
    area: str
    city: str
    today_booking_count: int = 0
