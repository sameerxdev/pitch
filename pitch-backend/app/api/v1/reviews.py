from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_player
from app.core.envelope import success
from app.core.exceptions import validation_error
from app.schemas.review import ReplyReviewBody
from app.services import review_service
from app.utils.files import save_images

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _coerce_int(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except ValueError:
        raise validation_error(f"Invalid integer value: {value!r}")


@router.post("")
async def submit_review(
    booking_id: str = Form(...),
    overall_rating: int = Form(..., ge=1, le=5),
    rating_pitch: Optional[str] = Form(default=None),
    rating_cleanliness: Optional[str] = Form(default=None),
    rating_value: Optional[str] = Form(default=None),
    rating_manager: Optional[str] = Form(default=None),
    review_text: Optional[str] = Form(default=None),
    photos: Optional[List[UploadFile]] = File(default=None),
    photo_urls: Optional[str] = Form(default=None),
    player=Depends(require_player),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    urls: List[str] = []
    if photos:
        urls = await save_images(photos, max_count=settings.MAX_REVIEW_PHOTOS, subdir="reviews")
    if photo_urls:
        try:
            urls.extend(json.loads(photo_urls))
        except json.JSONDecodeError:
            urls.extend([u.strip() for u in photo_urls.split(",") if u.strip()])
    if len(urls) > settings.MAX_REVIEW_PHOTOS:
        raise validation_error(f"Too many photos (max {settings.MAX_REVIEW_PHOTOS}).")

    body = {
        "booking_id": booking_id,
        "overall_rating": overall_rating,
        "rating_pitch": _coerce_int(rating_pitch),
        "rating_cleanliness": _coerce_int(rating_cleanliness),
        "rating_value": _coerce_int(rating_value),
        "rating_manager": _coerce_int(rating_manager),
        "review_text": review_text,
        "photos": urls,
    }
    return success(await review_service.submit_review(db, player, body))


@router.post("/{review_id}/reply")
async def reply(
    review_id: str,
    body: ReplyReviewBody,
    user=Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return success(await review_service.reply_to_review(db, user, review_id, body.reply_text))
