from __future__ import annotations

import re
from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")

PHONE_REGEX = re.compile(r"^\+923\d{9}$")
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_phone(value: str) -> str:
    if not PHONE_REGEX.match(value):
        raise ValueError("Phone must be E.164 PK format: +923XXXXXXXXX")
    return value


class Pagination(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    limit: int
    offset: int


class ApplySlotsResult(BaseModel):
    days_affected: int
    slots_per_day: int
    total_slots_upserted: int


class PhoneBody(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return validate_phone(v)
