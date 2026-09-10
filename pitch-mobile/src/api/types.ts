// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "player" | "manager" | "ground_owner" | "admin";

export type GroundStatus =
  | "pending_verification"
  | "active"
  | "inactive"
  | "suspended";

export type SlotStatus = "available" | "on_hold" | "booked" | "blocked";

export type RateType = "day" | "night";

export type BookingStatus =
  | "on_hold"
  | "confirmed"
  | "arrived"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "jazzcash" | "easypaisa";

export type CompletionPaymentMethod = "cash" | "bank_transfer";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  full_name: string | null;
  role: UserRole;
  city: string | null;
  is_verified: boolean;
  fcm_token: string | null;
  created_at: string;
}

export interface Ground {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  hourly_rate_day: number;
  hourly_rate_night: number;
  advance_percent: number;
  avg_rating: number;
  review_count: number;
  status: GroundStatus;
  photos: string[];
  facilities: string[];
  created_at: string;
}

/** Ground detail responses embed a preview of the newest reviews. */
export interface GroundDetail extends Ground {
  latest_reviews: Review[];
}

export interface Slot {
  id: string;
  ground_id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: SlotStatus;
  rate_type: RateType;
  price: number;
  hold_expires_at: string | null;
}

/** How slots are generated for a ground (manager / owner). */
export interface GroundSlotSchedule {
  slot_duration_hours: number;
  operating_start_hour: number;
  operating_end_hour: number;
  /** Slots starting at this hour or later use night rate. */
  night_start_hour: number;
  hourly_rate_day: number;
  hourly_rate_night: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  player_id: string;
  /** Player who confirmed the booking; optional on older API payloads. */
  player_name?: string | null;
  /** Shown on manager booking detail; optional on older API payloads. */
  player_phone?: string | null;
  ground_id: string;
  ground_name: string;
  ground_area: string;
  slot_date: string;
  start_hour: number;
  end_hour: number;
  status: BookingStatus;
  total_price: number;
  advance_amount: number;
  qr_code: string | null;
  arrived_at: string | null;
  completion_payment_method: CompletionPaymentMethod | null;
  remainder_collected: number;
  review_submitted: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  player_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gateway_txn_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
}

export interface Review {
  id: string;
  booking_id: string;
  ground_id: string;
  player_id: string;
  player_name: string;
  overall_rating: number;
  rating_pitch: number | null;
  rating_cleanliness: number | null;
  rating_value: number | null;
  rating_manager: number | null;
  review_text: string | null;
  photos: string[];
  is_visible: boolean;
  manager_reply: string | null;
  manager_reply_at: string | null;
  created_at: string;
}

export interface ManagerAssignment {
  id: string;
  ground_id: string;
  ground_name: string;
  ground_area: string;
  ground_city: string;
  /** Null while the invited phone has not signed up yet. */
  manager_id: string | null;
  manager_name: string | null;
  manager_phone: string;
  is_active: boolean;
  /** True when the invite is still waiting on the phone's first login. */
  is_pending_signup: boolean;
  assigned_at: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsPeriod {
  bookings_count: number;
  bookings_trend_percent: number;
  estimated_revenue: number;
  estimated_revenue_trend_percent: number;
  collected_revenue: number;
  collected_revenue_trend_percent: number;
}

export interface DailyBookingVolume {
  date: string;
  count: number;
}

export interface OwnerAnalytics {
  period: AnalyticsPeriod;
  daily_volume: DailyBookingVolume[];
  per_ground: Array<{
    ground_id: string;
    ground_name: string;
    metrics: AnalyticsPeriod;
  }>;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** Ground row in the admin console — the base ground plus operator context. */
export interface AdminGround extends Ground {
  owner_name: string | null;
  owner_phone: string | null;
  manager_count: number;
  booking_count: number;
}

export interface AdminUser extends User {
  is_suspended: boolean;
  deleted_at: string | null;
  /** Present for ground_owner rows. */
  ground_count?: number;
  /** Present for player rows. */
  booking_count?: number;
}

export interface AdminReview extends Review {
  ground_name: string;
}

export interface PlatformTotals {
  players: number;
  managers: number;
  owners: number;
  grounds_active: number;
  grounds_pending: number;
  grounds_suspended: number;
  bookings_total: number;
  reviews_total: number;
  reviews_hidden: number;
}

export interface PlatformAnalytics {
  period: string;
  totals: PlatformTotals;
  period_metrics: {
    bookings: number;
    gross_value: number;
    collected: number;
  };
  booking_status_breakdown: Record<string, number>;
  daily_volume: DailyBookingVolume[];
  top_grounds: Array<{
    ground_id: string;
    ground_name: string;
    bookings: number;
    revenue: number;
  }>;
}

// ─── API Request/Response shapes ─────────────────────────────────────────────

export interface ApiEnvelope<T> {
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Auth
export interface RequestOtpRequest {
  phone: string;
}

export interface RequestOtpResponse {
  expires_in: number;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface VerifyOtpResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// Bookings
export interface CreateBookingRequest {
  slot_id: string;
  ground_id: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  advance_amount: number;
  total_price: number;
  hold_expires_at: string;
}

export interface InitiatePaymentRequest {
  booking_id: string;
  method: PaymentMethod;
}

export interface InitiatePaymentResponse {
  payment_url: string;
  payment_id: string;
}

export interface ArriveRequest {
  method: "qr" | "manual";
  qr_token?: string;
}

export interface CompleteBookingRequest {
  payment_method: CompletionPaymentMethod;
  amount_received: number;
}

// Reviews
export interface SubmitReviewRequest {
  booking_id: string;
  overall_rating: number;
  rating_pitch?: number;
  rating_cleanliness?: number;
  rating_value?: number;
  rating_manager?: number;
  review_text?: string;
  photos?: string[];
}

export interface ReplyToReviewRequest {
  reply_text: string;
}

// Ground filters
export interface GroundSearchParams {
  search?: string;
  city?: string;
  min_rating?: number;
  max_price?: number;
  lat?: number;
  lng?: number;
  limit?: number;
  offset?: number;
}

// Manager
export interface ManagerGround {
  id: string;
  name: string;
  area: string;
  city: string;
  today_booking_count: number;
}

export interface ApplySlotsSlotTemplate {
  start_hour: number;
  end_hour: number;
  rate_type: RateType;
  price?: number;
}

export interface ApplySlotsRequest {
  from_date: string;
  to_date: string;
  hourly_rate_day: number;
  hourly_rate_night: number;
  slots: ApplySlotsSlotTemplate[];
}

export interface ApplySlotsResponse {
  days_affected: number;
  slots_per_day: number;
  total_slots_upserted: number;
}

// Owner
export interface CreateGroundRequest {
  name: string;
  city: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  hourly_rate_day: number;
  hourly_rate_night: number;
  advance_percent: number;
  facilities?: string[];
}

export interface AssignManagerRequest {
  phone: string;
}

// Cached QR data (stored offline)
export interface CachedQR {
  booking_id: string;
  qr_token: string;
  ground_name: string;
  ground_area: string;
  slot_date: string;
  start_hour: number;
  end_hour: number;
  advance_amount: number;
  remainder: number;
  booking_reference: string;
}
