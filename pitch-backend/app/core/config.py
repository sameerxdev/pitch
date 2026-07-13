from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    # Comma-separated list in env (e.g. "*" or "https://a.com,https://b.com").
    # Kept as raw string to avoid pydantic-settings trying to JSON-decode list fields.
    CORS_ORIGINS: str = "*"

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "pitch"

    JWT_SECRET: str = "change_me_super_secret_value"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 60
    REFRESH_TOKEN_TTL_DAYS: int = 30

    OTP_LENGTH: int = 6
    OTP_TTL_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 3
    OTP_DEBUG: bool = True
    # When true, /auth/verify-otp accepts any code and creates the user if needed.
    # /auth/request-otp becomes a no-op. DISABLE IN PRODUCTION (set AUTH_BYPASS_OTP=false in .env).
    AUTH_BYPASS_OTP: bool = True
    # When true, /payments/initiate immediately marks the payment "completed" and
    # transitions the booking to "confirmed" (issuing a QR token). This lets the
    # mobile pay-screen poll succeed without a real JazzCash/Easypaisa gateway.
    # DISABLE IN PRODUCTION (set PAYMENT_AUTO_COMPLETE=false in .env).
    PAYMENT_AUTO_COMPLETE: bool = True

    HOLD_DURATION_SECONDS: int = 600
    PLAYER_MAX_BOOKING_DAYS_AHEAD: int = 14
    QR_SCAN_WINDOW_MINUTES: int = 30
    MAX_GROUND_PHOTOS: int = 8
    MAX_REVIEW_PHOTOS: int = 3

    UPLOAD_DIR: str = "/data/uploads"
    PUBLIC_MEDIA_BASE_URL: str = "http://localhost:8000/media"

    @property
    def cors_origins_list(self) -> List[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
