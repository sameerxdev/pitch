from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Iterable, List

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import validation_error

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def ensure_upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


async def save_images(files: Iterable[UploadFile], max_count: int, subdir: str = "") -> List[str]:
    files_list = [f for f in files if f is not None and f.filename]
    if not files_list:
        return []
    if len(files_list) > max_count:
        raise validation_error(f"Too many photos (max {max_count}).")
    base = ensure_upload_dir()
    target_dir = base / subdir if subdir else base
    target_dir.mkdir(parents=True, exist_ok=True)
    urls: List[str] = []
    for f in files_list:
        content_type = (f.content_type or "").lower()
        ext = ALLOWED_IMAGE_TYPES.get(content_type)
        if not ext:
            raise validation_error(f"Unsupported file type: {content_type}")
        name = f"{secrets.token_urlsafe(12)}{ext}"
        dest = target_dir / name
        data = await f.read()
        with open(dest, "wb") as out:
            out.write(data)
        rel = (subdir + "/" if subdir else "") + name
        urls.append(f"{settings.PUBLIC_MEDIA_BASE_URL.rstrip('/')}/{rel}")
    return urls
