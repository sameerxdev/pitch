from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import DATE_REGEX

SlotStatus = Literal["available", "on_hold", "booked", "blocked"]
RateType = Literal["day", "night"]


class SlotOut(BaseModel):
    id: str
    ground_id: str
    date: str
    start_hour: int
    end_hour: int
    status: SlotStatus
    rate_type: RateType
    price: float
    hold_expires_at: Optional[str] = None


class UpdateSlotBody(BaseModel):
    status: Optional[Literal["available", "blocked"]] = None
    price: Optional[float] = Field(default=None, ge=0)


class SlotTemplateItem(BaseModel):
    start_hour: int = Field(..., ge=0, le=23)
    end_hour: int = Field(..., ge=1, le=24)
    rate_type: RateType
    price: Optional[float] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _check_range(self):
        if self.end_hour <= self.start_hour:
            raise ValueError("end_hour must be greater than start_hour")
        return self


class ApplySlotsBody(BaseModel):
    from_date: str
    to_date: str
    hourly_rate_day: float = Field(..., ge=0)
    hourly_rate_night: float = Field(..., ge=0)
    slots: List[SlotTemplateItem]

    @field_validator("from_date", "to_date")
    @classmethod
    def _v_date(cls, v: str) -> str:
        if not DATE_REGEX.match(v):
            raise ValueError("Date must be YYYY-MM-DD")
        return v

    @model_validator(mode="after")
    def _v_overlaps(self):
        items = sorted(self.slots, key=lambda s: s.start_hour)
        for a, b in zip(items, items[1:]):
            if a.end_hour > b.start_hour:
                raise ValueError(
                    f"Overlapping slot templates: {a.start_hour}-{a.end_hour} and {b.start_hour}-{b.end_hour}"
                )
        return self
