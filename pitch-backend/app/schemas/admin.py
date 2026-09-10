from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

AdminGroundStatus = Literal["pending_verification", "active", "inactive", "suspended"]
AdminUserRole = Literal["player", "manager", "ground_owner", "admin"]


class VerifyGroundBody(BaseModel):
    """Approve or reject a ground awaiting verification."""

    approve: bool
    reason: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _reason_required_on_reject(self):
        if not self.approve and not (self.reason or "").strip():
            raise ValueError("reason is required when rejecting a ground")
        return self


class UpdateGroundStatusBody(BaseModel):
    status: AdminGroundStatus
    reason: Optional[str] = Field(default=None, max_length=500)


class UpdateUserBody(BaseModel):
    role: Optional[AdminUserRole] = None
    is_suspended: Optional[bool] = None

    @model_validator(mode="after")
    def _at_least_one(self):
        if self.role is None and self.is_suspended is None:
            raise ValueError("provide role and/or is_suspended")
        return self


class ModerateReviewBody(BaseModel):
    is_visible: bool


class PlatformTotals(BaseModel):
    players: int = 0
    managers: int = 0
    owners: int = 0
    grounds_active: int = 0
    grounds_pending: int = 0
    grounds_suspended: int = 0
    bookings_total: int = 0
    reviews_total: int = 0
    reviews_hidden: int = 0


class PlatformPeriodMetrics(BaseModel):
    bookings: int = 0
    gross_value: float = 0
    collected: float = 0


class TopGround(BaseModel):
    ground_id: str
    ground_name: str
    bookings: int
    revenue: float


class DailyVolumeItem(BaseModel):
    date: str
    count: int


class PlatformAnalytics(BaseModel):
    period: str
    totals: PlatformTotals
    period_metrics: PlatformPeriodMetrics
    booking_status_breakdown: Dict[str, int] = Field(default_factory=dict)
    daily_volume: List[DailyVolumeItem] = Field(default_factory=list)
    top_grounds: List[TopGround] = Field(default_factory=list)
