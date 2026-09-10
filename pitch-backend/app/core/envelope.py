from __future__ import annotations

from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError


def success(data: Any = None, meta: Optional[dict[str, Any]] = None, status_code: int = 200) -> JSONResponse:
    body = {"data": data, "error": None, "meta": meta or {}}
    return JSONResponse(body, status_code=status_code)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    body = {
        "data": None,
        "error": {"code": exc.code, "message": exc.message, "details": exc.details},
    }
    return JSONResponse(body, status_code=exc.status_code)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
    }
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        body = {"data": None, "error": exc.detail}
    else:
        body = {
            "data": None,
            "error": {
                "code": code_map.get(exc.status_code, "HTTP_ERROR"),
                "message": str(exc.detail) if exc.detail else "Request failed.",
                "details": None,
            },
        }
    return JSONResponse(body, status_code=exc.status_code)


async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Domain-level ValueErrors (e.g. a malformed ObjectId) are client errors, not 500s."""
    body = {
        "data": None,
        "error": {"code": "VALIDATION_ERROR", "message": str(exc) or "Invalid request.", "details": None},
    }
    return JSONResponse(body, status_code=400)


async def validation_exception_handler(request: Request, exc) -> JSONResponse:
    details: dict[str, list[str]] = {}
    try:
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
            details.setdefault(loc or "_", []).append(err.get("msg", "invalid"))
    except Exception:
        details = {"_": ["invalid payload"]}
    body = {
        "data": None,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid request payload.",
            "details": details,
        },
    }
    return JSONResponse(body, status_code=400)
