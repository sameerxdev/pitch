from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import close_mongo, connect_mongo
from app.core.envelope import (
    app_error_handler,
    http_exception_handler,
    success,
    validation_exception_handler,
    value_error_handler,
)
from app.core.exceptions import AppError
from app.services.jobs import hold_expiry_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("pitch")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_mongo()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    task = asyncio.create_task(hold_expiry_loop(60))
    logger.info("PITCH backend started on env=%s", settings.APP_ENV)
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
        await close_mongo()


app = FastAPI(
    title="PITCH Backend",
    version="1.0.0",
    description="Self-hosted backend for the PITCH mobile app.",
    lifespan=lifespan,
)

_origins = settings.cors_origins_list
_allow_all = _origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # Browsers reject "*" + credentials; flip credentials off when wildcard.
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
# A malformed id reaches to_oid() as a plain ValueError; without this it would
# surface as an opaque 500 instead of a 400 the client can act on.
app.add_exception_handler(ValueError, value_error_handler)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
async def root():
    return success({"service": "pitch-backend", "version": "1.0.0", "api": settings.API_V1_PREFIX})


@app.get("/health", tags=["health"])
async def health():
    return success({"status": "ok"})


# Serve uploaded media
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")
