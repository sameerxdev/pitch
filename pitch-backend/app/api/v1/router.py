from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.grounds import router as grounds_router
from app.api.v1.manager import router as manager_router
from app.api.v1.owner import router as owner_router
from app.api.v1.payments import router as payments_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(grounds_router)
api_router.include_router(bookings_router)
api_router.include_router(payments_router)
api_router.include_router(reviews_router)
api_router.include_router(manager_router)
api_router.include_router(owner_router)
api_router.include_router(admin_router)
