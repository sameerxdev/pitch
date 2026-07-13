export const Config = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  QR_SCAN_WINDOW_MINUTES: 30,
  HOLD_DURATION_SECONDS: 600,
  OTP_RESEND_COOLDOWN_SECONDS: 30,
  OTP_MAX_ATTEMPTS: 3,
  MAX_REVIEW_PHOTOS: 3,
  MAX_GROUND_PHOTOS: 8,
  /** Players may only book slots within this many days from today. */
  PLAYER_MAX_BOOKING_DAYS_AHEAD: 14,
  SLOT_POLL_INTERVAL_MS: 30_000,
  PAYMENT_POLL_INTERVAL_MS: 3_000,
  PAYMENT_POLL_TIMEOUT_MS: 300_000,
  SESSION_TIMEOUT_DAYS: 30,
  /**
   * When true, last signed-in user is restored from SecureStore on launch.
   * When false, tokens/user are cleared on each cold start so the app always opens at enter-phone (avoids stale demo roles e.g. admin).
   */
  PERSIST_AUTH_SESSION: false,
} as const;
