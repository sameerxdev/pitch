from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SubmitReviewBody(BaseModel):
    booking_id: str
    overall_rating: int = Field(..., ge=1, le=5)
    rating_pitch: Optional[int] = Field(default=None, ge=1, le=5)
    rating_cleanliness: Optional[int] = Field(default=None, ge=1, le=5)
    rating_value: Optional[int] = Field(default=None, ge=1, le=5)
    rating_manager: Optional[int] = Field(default=None, ge=1, le=5)
    review_text: Optional[str] = Field(default=None, max_length=1000)
    photos: List[str] = Field(default_factory=list)


class ReplyReviewBody(BaseModel):
    reply_text: str = Field(..., min_length=1, max_length=1000)


class ReviewOut(BaseModel):
    id: str
    booking_id: str
    ground_id: str
    player_id: str
    player_name: str
    overall_rating: int
    rating_pitch: Optional[int] = None
    rating_cleanliness: Optional[int] = None
    rating_value: Optional[int] = None
    rating_manager: Optional[int] = None
    review_text: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    is_visible: bool = True
    manager_reply: Optional[str] = None
    manager_reply_at: Optional[str] = None
    created_at: str
