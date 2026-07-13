# PITCH Backend API Specification

This document is derived from the **pitch-mobile** React Native application (`src/api/*`, screens, demo business logic, and `src/constants/config.ts`). Use it as the contract to implement the self-hosted backend so the mobile app can switch from demo/seed data to live APIs.

**Base URL:** `{API_HOST}/api/v1` (mobile env: `EXPO_PUBLIC_API_BASE_URL`)

**Version:** 1.0 (aligned with mobile frontend as of May 2026)

---

## Table of contents

1. [Conventions](#1-conventions)
2. [Authentication & users](#2-authentication--users)
3. [Player — grounds & slots](#3-player--grounds--slots)
4. [Player — bookings & payments](#4-player--bookings--payments)
5. [Player — reviews](#5-player--reviews)
6. [Manager APIs](#6-manager-apis)
7. [Ground owner APIs](#7-ground-owner-apis)
8. [Admin (phase 2)](#8-admin-phase-2)
9. [Push notifications](#9-push-notifications)
10. [Cross-cutting business rules](#10-cross-cutting-business-rules)
11. [Suggested data model](#11-suggested-data-model)
12. [Endpoint index](#12-endpoint-index)

---

## 1. Conventions

### 1.1 Transport

| Item | Value |
|------|--------|
| Protocol | HTTPS (HTTP allowed in dev) |
| Content-Type | `application/json` unless multipart |
| Auth header | `Authorization: Bearer {access_token}` |
| Timeout | Client uses 5s default; booking/payment may need longer server-side |

### 1.2 Response envelope

Successful JSON responses:

```json
{
  "data": { },
  "error": null,
  "meta": {}
}
```

Error responses:

```json
{
  "data": null,
  "error": {
    "code": "SLOT_NOT_AVAILABLE",
    "message": "This slot is no longer available.",
    "details": {
      "slot_id": ["already booked"]
    }
  }
}
```

- `details` is optional; map field names to string arrays for validation errors.
- HTTP status: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `422` business rule violation.

### 1.3 Pagination

List endpoints return:

```json
{
  "items": [],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

Query params: `limit` (default 20, max 100), `offset` (default 0).

### 1.4 Dates & times

| Field | Format |
|-------|--------|
| Calendar date | `YYYY-MM-DD` (e.g. `2026-05-15`) |
| Timestamps | ISO 8601 UTC (e.g. `2026-05-15T10:30:00.000Z`) |
| Slot hours | Integer **0–23** start, **1–24** end (end exclusive midnight uses `24`) |
| Phone | E.164 Pakistan: `+92` + 10 digits starting with `3` |

### 1.5 Roles & authorization

| Role | `User.role` | Access |
|------|-------------|--------|
| Player | `player` | Browse active grounds, book, pay, review |
| Manager | `manager` | Assigned grounds only: slots, bookings, scan, reviews reply |
| Ground owner | `ground_owner` | Own grounds: CRUD, managers, slots, analytics, reviews |
| Admin | `admin` | Web dashboard primary; mobile read-only phase 2 |

Every protected route must verify JWT and role + resource ownership (e.g. manager only for `manager_assignments.ground_id`).

### 1.6 File uploads

Multipart field name: `photos` (array of files).

Used for:

- Owner create ground (max **8** photos — `MAX_GROUND_PHOTOS`)
- Review submission (max **3** photos — `MAX_REVIEW_PHOTOS`)

Non-file fields in multipart: send as form fields (strings). Arrays like `facilities` may be JSON string or repeated fields.

---

## 2. Authentication & users

### 2.1 Request OTP

`POST /auth/request-otp`

**Auth:** None

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | E.164, e.g. `+923001234567` |

**Response `data`:**

| Field | Type | Description |
|-------|------|-------------|
| `expires_in` | number | OTP validity seconds (client shows resend cooldown 30s) |

**Rules:**

- Rate-limit per phone/IP.
- OTP length: **6 digits**.
- Max verify attempts: **3** (`OTP_MAX_ATTEMPTS`) before lockout/cooldown.

---

### 2.2 Verify OTP

`POST /auth/verify-otp`

**Auth:** None

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Same as request |
| `otp` | string | Yes | 6-digit code |

**Response `data`:**

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT access token |
| `refresh_token` | string | JWT refresh token |
| `user` | User | See [User entity](#user) |

**Rules:**

- **Production:** `user.role` is determined server-side (existing user, manager assignment, owner record). Do not trust client-sent role.
- **Demo app** shows role picker at OTP — ignore for production.
- New users: `full_name` may be `null` → app routes to profile setup.
- Refresh token TTL ~ **30 days** (`SESSION_TIMEOUT_DAYS`).

---

### 2.3 Refresh token

`POST /auth/refresh`

**Auth:** None (body carries refresh token)

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `refresh_token` | string | Yes |

**Response `data`:**

| Field | Type |
|-------|------|
| `access_token` | string |
| `refresh_token` | string |

**Note:** Mobile interceptor expects raw `{ access_token, refresh_token }` at top level OR inside `data` — align with envelope and update client if needed.

---

### 2.4 Logout

`POST /auth/logout`

**Auth:** Bearer

**Body:** empty optional

**Response:** `204` or `{ "data": null }`

Invalidate refresh token server-side.

---

### 2.5 Get current user

`GET /users/me`

**Auth:** Bearer

**Response `data`:** User

---

### 2.6 Update current user

`PATCH /users/me`

**Auth:** Bearer

**Body (partial):**

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string | Min 2 chars; required after first login |
| `city` | string | Pakistan city name |
| `fcm_token` | string \| null | Push notification token |

**Response `data`:** User

**Feature:** Profile setup screen — first-time name + city before entering app.

---

### 2.7 Delete account

`DELETE /users/me`

**Auth:** Bearer

Soft-delete or hard-delete per policy; cancel future bookings.

---

### User

```typescript
{
  id: string;
  phone: string;
  full_name: string | null;
  role: "player" | "manager" | "ground_owner" | "admin";
  city: string | null;
  is_verified: boolean;
  fcm_token: string | null;
  created_at: string; // ISO
}
```

---

## 3. Player — grounds & slots

### 3.1 List / search grounds

`GET /grounds`

**Auth:** Optional (Bearer improves personalization; public browse allowed if product requires)

**Query:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Name, area, city text search |
| `city` | string | Filter by city |
| `min_rating` | number | Minimum `avg_rating` |
| `max_price` | number | Max hourly day rate filter |
| `lat` | number | User latitude for distance sort |
| `lng` | number | User longitude |
| `limit` | number | Pagination |
| `offset` | number | Pagination |

**Response `data`:** `PaginatedResponse<Ground>`

**Rules:**

- Only return grounds with `status = active` for players.
- Include `photos[0]` as listing thumbnail.

---

### 3.2 Ground detail

`GET /grounds/{groundId}`

**Auth:** Optional

**Response `data`:** `Ground` + `latest_reviews: Review[]` (e.g. 3–5 recent visible reviews)

---

### 3.3 List slots for a ground

`GET /grounds/{groundId}/slots`

**Auth:** Optional

**Query:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Single day `YYYY-MM-DD` |
| `from` | string | Range start (inclusive) |
| `to` | string | Range end (inclusive) |

Use `date` **or** `from`+`to`.

**Response `data`:** `Slot[]`

**Player booking window:**

- Only expose bookable slots where date is **today ≤ date ≤ today + 14 days** (`PLAYER_MAX_BOOKING_DAYS_AHEAD`).
- Return slots with statuses: `available`, `on_hold` (with `hold_expires_at`), `booked`, `blocked` (blocked hidden or shown disabled — app hides non-bookable).

**Slot:**

```typescript
{
  id: string;
  ground_id: string;
  date: string;           // YYYY-MM-DD
  start_hour: number;     // 0-23
  end_hour: number;       // 1-24, end_hour > start_hour
  status: "available" | "on_hold" | "booked" | "blocked";
  rate_type: "day" | "night";
  price: number;          // PKR total for slot (not hourly)
  hold_expires_at: string | null; // ISO if on_hold
}
```

**Pricing:** Owner/manager defines per-slot `price` and `rate_type` when creating slots (see §7.4). No auto-generation required for player API if slots are persisted.

---

### 3.4 Ground reviews (public)

`GET /grounds/{groundId}/reviews`

**Auth:** Optional

**Query:** `limit`, `offset`

**Response `data`:** `PaginatedResponse<Review>` — only `is_visible: true`

---

## 4. Player — bookings & payments

### 4.1 Create booking (hold slot)

`POST /bookings`

**Auth:** Bearer (player)

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slot_id` | string | Yes | Target slot |
| `ground_id` | string | Yes | Must match slot |

**Response `data`:**

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | string | New booking ID |
| `advance_amount` | number | PKR due now (rounded per business rules) |
| `total_price` | number | Full slot price |
| `hold_expires_at` | string | ISO — **600 seconds** from now (`HOLD_DURATION_SECONDS`) |

**Server must:**

1. Validate slot is `available`, date within 14-day window, ground `active`.
2. Set slot → `on_hold`, set `hold_expires_at`.
3. Create booking `status = on_hold` (or `pending_advance`).
4. Compute `advance_amount = ceil((total_price * advance_percent / 100) / 10) * 10` (app uses round-up-to-10 pattern in `calculateAdvance`).

**Errors:**

| Code | When |
|------|------|
| `SLOT_NOT_AVAILABLE` | Booked/blocked/hold |
| `HOLD_EXPIRED` | Race on hold |
| `BOOKING_WINDOW_EXCEEDED` | Date > 14 days ahead |

---

### 4.2 List my bookings

`GET /bookings`

**Auth:** Bearer (player)

**Query:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Single or comma-separated: `confirmed,arrived` |
| `limit` | number | |
| `offset` | number | |

**Response `data`:** `PaginatedResponse<Booking>`

---

### 4.3 Booking detail

`GET /bookings/{bookingId}`

**Auth:** Bearer (owner of booking or staff)

**Response `data`:** Booking

**Polling:** Client may poll every 30s on active screens (`SLOT_POLL_INTERVAL_MS`).

---

### 4.4 Cancel booking

`DELETE /bookings/{bookingId}`

**Auth:** Bearer (player)

**Response `data`:** Booking with `status = cancelled`, `cancelled_at` set

**Rules:**

- Allowed before slot start (policy: until `arrived` or until slot start − X hours).
- Release slot to `available`.
- Refund advance per payment policy.

---

### 4.5 Initiate advance payment

`POST /payments/initiate`

**Auth:** Bearer (player)

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `booking_id` | string | Yes |
| `method` | `"jazzcash"` \| `"easypaisa"` | Yes |

**Response `data`:**

| Field | Type | Description |
|-------|------|-------------|
| `payment_url` | string | Redirect / deep link to wallet |
| `payment_id` | string | Internal payment record ID |

**After gateway success (webhook):**

- Payment `status = completed`
- Booking `status = confirmed`
- Generate `qr_code` token (signed JWT or opaque token)
- Slot `status = booked`
- Clear hold

**Client polling (implement):**

`GET /payments/{paymentId}` — see §4.6

Poll every **3s** (`PAYMENT_POLL_INTERVAL_MS`), timeout **300s** (`PAYMENT_POLL_TIMEOUT_MS`).

---

### 4.6 Get payment status (recommended)

`GET /payments/{paymentId}`

**Auth:** Bearer

**Response `data`:** Payment

```typescript
{
  id: string;
  booking_id: string;
  player_id: string;
  amount: number;
  method: "jazzcash" | "easypaisa";
  status: "pending" | "completed" | "failed" | "refunded";
  gateway_txn_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
}
```

---

### 4.7 Payment webhooks (server-side)

`POST /payments/webhooks/jazzcash`  
`POST /payments/webhooks/easypaisa`

Verify signature, idempotent update of Payment + Booking + Slot.

---

### Booking

```typescript
{
  id: string;
  slot_id: string;
  player_id: string;
  player_name?: string | null;   // Denormalized for manager UI
  player_phone?: string | null;
  ground_id: string;
  ground_name: string;
  ground_area: string;
  slot_date: string;
  start_hour: number;
  end_hour: number;
  status: "on_hold" | "confirmed" | "arrived" | "completed" | "cancelled" | "no_show";
  total_price: number;
  advance_amount: number;
  qr_code: string | null;      // Encoded token for scan
  arrived_at: string | null;
  completion_payment_method: "cash" | "bank_transfer" | null;
  remainder_collected: number; // PKR collected at ground
  review_submitted: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}
```

### QR / offline cache

On confirmed booking, mobile caches locally:

```typescript
{
  booking_id, qr_token, ground_name, ground_area,
  slot_date, start_hour, end_hour,
  advance_amount, remainder, booking_reference
}
```

`qr_token` must match value embedded in `qr_code` / scannable payload.

---

## 5. Player — reviews

### 5.1 Submit review

`POST /reviews`

**Auth:** Bearer (player)

**Content-Type:** `application/json` **or** `multipart/form-data`

**JSON body:**

| Field | Type | Required |
|-------|------|----------|
| `booking_id` | string | Yes |
| `overall_rating` | number | Yes, 1–5 |
| `rating_pitch` | number | No, 1–5 |
| `rating_cleanliness` | number | No, 1–5 |
| `rating_value` | number | No, 1–5 |
| `rating_manager` | number | No, 1–5 |
| `review_text` | string | No, max 1000 |
| `photos` | string[] | URLs if JSON; or multipart files |

**Rules:**

- Only after `booking.status = completed`.
- One review per booking.
- Set `booking.review_submitted = true`.
- Recalculate ground `avg_rating`, `review_count`.

**Response `data`:** Review

---

### 5.2 Reply to review (manager or owner)

`POST /reviews/{reviewId}/reply`

**Auth:** Bearer (manager for that ground, or ground owner)

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `reply_text` | string | Yes |

**Response `data`:** Review with `manager_reply`, `manager_reply_at`

---

### Review

```typescript
{
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
```

---

## 6. Manager APIs

Managers select an active ground after login (`GET /manager/grounds`), then operate in context of `groundId`.

### 6.1 List assigned grounds

`GET /manager/grounds`

**Auth:** Bearer (manager)

**Response `data`:** `ManagerGround[]`

```typescript
{
  id: string;
  name: string;
  area: string;
  city: string;
  today_booking_count: number; // Bookings for today at this ground
}
```

---

### 6.2 List slots

`GET /manager/grounds/{groundId}/slots`

**Auth:** Bearer (manager assigned to ground)

**Query:** `date`, or `from` + `to`

**Response `data`:** `Slot[]`

Same shape as §3.3; managers see all dates (including past for operations).

---

### 6.3 Update slot

`PATCH /manager/grounds/{groundId}/slots/{slotId}`

**Auth:** Bearer (manager)

**Body (partial):**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"available"` \| `"blocked"` | Toggle block/unblock |
| `price` | number | Optional price override |

**Response `data`:** Slot

**Rules:**

- Cannot block `booked` slots.
- Cannot change times of booked slots without admin override.

---

### 6.4 Apply manual slots (bulk) — **required by mobile UI**

`POST /manager/grounds/{groundId}/slots/apply`

**Auth:** Bearer (manager)

**Body:**

```json
{
  "from_date": "2026-05-15",
  "to_date": "2026-05-20",
  "hourly_rate_day": 2000,
  "hourly_rate_night": 3000,
  "slots": [
    {
      "start_hour": 0,
      "end_hour": 2,
      "rate_type": "night",
      "price": 6000
    },
    {
      "start_hour": 16,
      "end_hour": 18,
      "rate_type": "day"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from_date` | string | Yes | YYYY-MM-DD |
| `to_date` | string | Yes | YYYY-MM-DD, ≥ from_date |
| `hourly_rate_day` | number | Yes | Default PKR/hour for day slots without fixed price |
| `hourly_rate_night` | number | Yes | Default PKR/hour for night slots |
| `slots` | array | Yes | Slot templates applied to **each day** in range |

**Slot template item:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_hour` | number | Yes | 0–23 |
| `end_hour` | number | Yes | 1–24, > start_hour |
| `rate_type` | `"day"` \| `"night"` | Yes | Per-slot day/night flag |
| `price` | number | No | Fixed PKR; else `(end-start) * hourly_rate_*` |

**Response `data`:**

```json
{
  "days_affected": 6,
  "slots_per_day": 7,
  "total_slots_upserted": 42
}
```

**Rules:**

- **No past dates** (`from_date` ≥ today) for create/apply.
- Max range span: **90 days** per request.
- Merge by `(date, start_hour)`: upsert; do not delete booked slots.
- Validate no overlapping templates in request.
- Gaps in day = no bookable slots (e.g. no daytime slots 9am–4pm).

---

### 6.5 List bookings

`GET /manager/grounds/{groundId}/bookings`

**Auth:** Bearer (manager)

**Query:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Filter `slot_date` |
| `status` | string | Comma-separated statuses |
| `limit` | number | |
| `offset` | number | |

**Response `data`:** `PaginatedResponse<Booking>`

**Sort:** `slot_date` ASC, `start_hour` ASC (matches mobile).

---

### 6.6 Booking detail

`GET /manager/grounds/{groundId}/bookings/{bookingId}`

**Auth:** Bearer (manager)

**Response `data`:** Booking (include `player_name`, `player_phone`)

---

### 6.7 Confirm arrival (QR or manual)

`POST /bookings/{bookingId}/arrive`

**Auth:** Bearer (manager)

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | `"qr"` \| `"manual"` | Yes | |
| `qr_token` | string | If method=qr | Scanned payload |

**Response `data`:** Booking with `status = arrived`, `arrived_at` set

**Business rules (from mobile):**

| Error code | Condition |
|------------|-----------|
| `INVALID_QR_TOKEN` | Token not found / wrong format |
| `QR_WRONG_GROUND` | Booking for another ground |
| `QR_OUTSIDE_TIME_WINDOW` | Outside ±**30** min of slot start (`QR_SCAN_WINDOW_MINUTES`) |
| `ARRIVAL_ALREADY_CONFIRMED` | Already `arrived` |
| — | Booking must be `confirmed` (or `on_hold` if product allows pay-at-venue) |

**Manual check-in:** Manager enters booking reference / phone on booking detail — same endpoint with `method: "manual"` and optional `booking_id` lookup via `GET` by reference.

---

### 6.8 Complete booking (collect remainder)

`POST /bookings/{bookingId}/complete`

**Auth:** Bearer (manager)

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `payment_method` | `"cash"` \| `"bank_transfer"` | Yes |
| `amount_received` | number | Yes, ≥ 0 |

**Response `data`:** Booking with `status = completed`, `remainder_collected`, `completion_payment_method`

**Rules:**

- Prior status must be `arrived`.
- `amount_received` typically `total_price - advance_amount` but manager may enter partial/zero per policy.

---

### 6.9 List reviews

`GET /manager/grounds/{groundId}/reviews`

**Auth:** Bearer (manager)

**Query:** `sort=newest|oldest`, `limit`, `offset`

**Response `data`:** `PaginatedResponse<Review>`

---

## 7. Ground owner APIs

### 7.1 List my grounds

`GET /owner/grounds`

**Auth:** Bearer (ground_owner)

**Response `data`:** `Ground[]` (all statuses including `pending_verification`, `inactive`)

---

### 7.2 Create ground

`POST /owner/grounds`

**Auth:** Bearer (ground_owner)

**Content-Type:** `application/json` or `multipart/form-data`

**Body (CreateGroundRequest):**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes, min 3 |
| `city` | string | Yes |
| `area` | string | Yes |
| `address` | string | Yes |
| `latitude` | number | Yes |
| `longitude` | number | Yes |
| `hourly_rate_day` | number | Yes, min 100 |
| `hourly_rate_night` | number | Yes, min 100 |
| `advance_percent` | number | Yes, 10–50 |
| `facilities` | string[] | No — allowed: Washrooms, Floodlights, Parking, Cafeteria, Bats |

**Response `data`:** Ground with `status = pending_verification`

**Optional:** Assign manager phone in same request (future); mobile assigns on edit screen.

---

### 7.3 Update ground

`PATCH /owner/grounds/{groundId}`

**Auth:** Bearer (owner of ground)

**Body:** Partial `CreateGroundRequest` +

| Field | Type | Description |
|-------|------|-------------|
| `is_active` | boolean | Maps to `active` / `inactive` status |

**Response `data`:** Ground

---

### 7.4 Apply manual slots (owner)

`POST /owner/grounds/{groundId}/slots/apply`

**Auth:** Bearer (ground_owner)

Same request/response as §6.4.

---

### 7.5 List / assign / remove managers

`GET /owner/grounds/{groundId}/managers`

**Response `data`:** `ManagerAssignment[]`

`POST /owner/grounds/{groundId}/managers`

**Body:**

| Field | Type | Required |
|-------|------|----------|
| `phone` | string | Yes, E.164 |

**Behavior:**

- Find or invite user with role `manager`.
- Create assignment row.

`DELETE /owner/grounds/{groundId}/managers/{managerId}`

Remove assignment (`manager_id` in path).

### ManagerAssignment

```typescript
{
  id: string;
  ground_id: string;
  ground_name: string;
  ground_area: string;
  ground_city: string;
  manager_id: string;
  manager_name: string;
  manager_phone: string;
  is_active: boolean;
  assigned_at: string;
}
```

---

### 7.6 Owner analytics

`GET /owner/analytics`

**Auth:** Bearer (ground_owner)

**Query:**

| Param | Type | Description |
|-------|------|-------------|
| `period` | `today` \| `week` \| `month` | Required |
| `ground_id` | string | Optional filter |

**Response `data`:** OwnerAnalytics

```typescript
{
  period: {
    bookings_count: number;
    bookings_trend_percent: number;
    estimated_revenue: number;
    estimated_revenue_trend_percent: number;
    collected_revenue: number;
    collected_revenue_trend_percent: number;
  };
  daily_volume: { date: string; count: number }[];
  per_ground: {
    ground_id: string;
    ground_name: string;
    metrics: { /* same as period */ };
  }[];
}
```

---

### 7.7 Owner reviews by ground

`GET /owner/grounds/{groundId}/reviews`

**Auth:** Bearer (ground_owner)

**Query:** `sort`, `limit`, `offset`

**Response `data`:** `PaginatedResponse<Review>`

*Not yet in `src/api/owner.ts` but used by owner Reviews tab — implement for parity with manager.*

---

### Ground

```typescript
{
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
  advance_percent: number;      // 10-50
  avg_rating: number;
  review_count: number;
  status: "pending_verification" | "active" | "inactive" | "suspended";
  photos: string[];             // URLs
  facilities: string[];
  created_at: string;
}
```

---

## 8. Admin (phase 2)

Mobile shows placeholder only. Planned web dashboard:

| Capability | Suggested endpoints |
|------------|---------------------|
| Verify grounds | `PATCH /admin/grounds/{id}/verify` |
| Suspend ground/user | `PATCH /admin/grounds/{id}`, `PATCH /admin/users/{id}` |
| Platform analytics | `GET /admin/analytics` |
| Moderate reviews | `PATCH /admin/reviews/{id}` (`is_visible`) |

---

## 9. Push notifications

Mobile registers FCM token via `PATCH /users/me` (`fcm_token`).

**Suggested notification events:**

| Event | Audience |
|-------|----------|
| Booking confirmed | Player |
| Booking reminder (1h before) | Player |
| New booking | Manager |
| Ground approved | Owner |
| Review received | Owner / Manager |
| Payment failed | Player |

---

## 10. Cross-cutting business rules

### 10.1 Slot lifecycle

```
available → on_hold (booking created) → booked (payment confirmed)
available → blocked (manager/owner)
blocked → available (manager/owner)
on_hold → available (hold expired / booking cancelled)
```

**Hold expiry job:** Every minute, release holds where `hold_expires_at < now` and cancel `on_hold` bookings.

### 10.2 Player booking horizon

Maximum **14 days** ahead from today.

### 10.3 Advance payment

`advance_percent` on ground (10–50%). Player pays advance via JazzCash/Easypaisa; remainder at venue on completion.

### 10.4 QR check-in window

±**30 minutes** from slot `start_hour` on `slot_date` (local ground timezone recommended: Asia/Karachi).

### 10.5 Facilities enum

`Washrooms`, `Floodlights`, `Parking`, `Cafeteria`, `Bats` — validate on create/update.

### 10.6 Cities

Support Pakistan cities list in mobile (`PAKISTAN_CITIES` in `src/constants/routes.ts`) for profile and ground forms.

### 10.7 Idempotency

Use `Idempotency-Key` header on `POST /bookings` and `POST /payments/initiate` to prevent duplicate holds/charges.

### 10.8 CORS / mobile

No cookie auth; JWT only. Expo app may call LAN IP in dev (`EXPO_PUBLIC_API_BASE_URL`).

---

## 11. Suggested data model

Core tables (relational):

| Table | Notes |
|-------|--------|
| `users` | phone unique, role, profile |
| `grounds` | owner_id FK, status, rates, geo |
| `ground_photos` | url, sort_order |
| `slots` | ground_id, date, start_hour, end_hour, status, rate_type, price, hold_expires_at |
| `bookings` | slot_id, player_id, status, amounts, qr_code, timestamps |
| `payments` | booking_id, gateway, status |
| `reviews` | booking_id unique, ratings, reply |
| `manager_assignments` | ground_id, manager_id |
| `otp_codes` | phone, code hash, expires_at |
| `refresh_tokens` | user_id, token hash, expires_at |

**Indexes:**

- `slots(ground_id, date)`
- `bookings(ground_id, slot_date, status)`
- `bookings(player_id, created_at DESC)`

---

## 12. Endpoint index

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/request-otp` | Public |
| POST | `/auth/verify-otp` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Auth |
| GET | `/users/me` | Auth |
| PATCH | `/users/me` | Auth |
| DELETE | `/users/me` | Auth |
| GET | `/grounds` | Public/Auth |
| GET | `/grounds/{id}` | Public/Auth |
| GET | `/grounds/{id}/slots` | Public/Auth |
| GET | `/grounds/{id}/reviews` | Public |
| POST | `/bookings` | Player |
| GET | `/bookings` | Player |
| GET | `/bookings/{id}` | Auth |
| DELETE | `/bookings/{id}` | Player |
| POST | `/bookings/{id}/arrive` | Manager |
| POST | `/bookings/{id}/complete` | Manager |
| POST | `/payments/initiate` | Player |
| GET | `/payments/{id}` | Player |
| POST | `/reviews` | Player |
| POST | `/reviews/{id}/reply` | Manager/Owner |
| GET | `/manager/grounds` | Manager |
| GET | `/manager/grounds/{id}/slots` | Manager |
| PATCH | `/manager/grounds/{id}/slots/{slotId}` | Manager |
| POST | `/manager/grounds/{id}/slots/apply` | Manager |
| GET | `/manager/grounds/{id}/bookings` | Manager |
| GET | `/manager/grounds/{id}/bookings/{bid}` | Manager |
| GET | `/manager/grounds/{id}/reviews` | Manager |
| GET | `/owner/grounds` | Owner |
| POST | `/owner/grounds` | Owner |
| PATCH | `/owner/grounds/{id}` | Owner |
| POST | `/owner/grounds/{id}/slots/apply` | Owner |
| GET | `/owner/grounds/{id}/managers` | Owner |
| POST | `/owner/grounds/{id}/managers` | Owner |
| DELETE | `/owner/grounds/{id}/managers/{mid}` | Owner |
| GET | `/owner/analytics` | Owner |
| GET | `/owner/grounds/{id}/reviews` | Owner |

---

## Mobile integration checklist

When backend is ready:

1. Set `EXPO_PUBLIC_API_BASE_URL` in `.env`.
2. Set `PERSIST_AUTH_SESSION: true` in config for production.
3. Replace demo OTP/login with `requestOtp` / `verifyOtp` in `app/(auth)/*`.
4. Replace `slotDemo` / `ownerDemo` / `managerDemo` hooks with TanStack Query calling API modules in `src/api/`.
5. Wire `initiatePayment` + payment status polling in `pay.tsx`.
6. Wire `arriveBooking` / `completeBooking` in manager screens.
7. Implement `POST .../slots/apply` in owner API module (mirror manager).

---

*Generated from pitch-mobile source. Extend this document when new screens or API modules are added.*
