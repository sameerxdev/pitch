from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException


class AppError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail={"code": code, "message": message, "details": details})
        self.code = code
        self.message = message
        self.details = details


# Common error shortcuts -------------------------------------------------

def validation_error(message: str, details: Optional[dict[str, Any]] = None) -> AppError:
    return AppError(400, "VALIDATION_ERROR", message, details)


def unauthorized(message: str = "Authentication required.") -> AppError:
    return AppError(401, "UNAUTHORIZED", message)


def forbidden(message: str = "You do not have permission to perform this action.") -> AppError:
    return AppError(403, "FORBIDDEN", message)


def not_found(message: str = "Resource not found.") -> AppError:
    return AppError(404, "NOT_FOUND", message)


def conflict(code: str, message: str, details: Optional[dict[str, Any]] = None) -> AppError:
    return AppError(409, code, message, details)


def service_unavailable(code: str, message: str) -> AppError:
    return AppError(503, code, message)


def business_rule(code: str, message: str, details: Optional[dict[str, Any]] = None) -> AppError:
    return AppError(422, code, message, details)
