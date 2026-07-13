from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import validate_phone


class PeriodMetrics(BaseModel):
    bookings_count: int = 0
    bookings_trend_percent: float = 0
    estimated_revenue: float = 0
    estimated_revenue_trend_percent: float = 0
    collected_revenue: float = 0
    collected_revenue_trend_percent: float = 0


class DailyVolumeItem(BaseModel):
    date: str
    count: int


class PerGroundMetrics(BaseModel):
    ground_id: str
    ground_name: str
    metrics: PeriodMetrics


class OwnerAnalytics(BaseModel):
    period: PeriodMetrics
    daily_volume: List[DailyVolumeItem] = Field(default_factory=list)
    per_ground: List[PerGroundMetrics] = Field(default_factory=list)


AnalyticsPeriod = Literal["today", "week", "month"]


class AssignManagerBody(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return validate_phone(v)


class ManagerAssignmentOut(BaseModel):
    id: str
    ground_id: str
    ground_name: str
    ground_area: str
    ground_city: str
    manager_id: str
    manager_name: Optional[str] = None
    manager_phone: str
    is_active: bool
    assigned_at: str
