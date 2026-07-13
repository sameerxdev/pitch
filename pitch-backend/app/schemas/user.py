from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Role = Literal["player", "manager", "ground_owner", "admin"]


class UserOut(BaseModel):
    id: str
    phone: str
    full_name: Optional[str] = None
    role: Role
    city: Optional[str] = None
    is_verified: bool = False
    fcm_token: Optional[str] = None
    created_at: str


class UpdateUserBody(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    city: Optional[str] = Field(default=None, min_length=2, max_length=80)
    fcm_token: Optional[str] = Field(default=None, max_length=512)
