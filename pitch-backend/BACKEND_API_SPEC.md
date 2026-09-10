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
8. [Admin](#8-admin)
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

- OTP length: **6 digits**.
- Max verify attempts: **3** (`OTP_MAX_ATTEMPTS`) before lockout/cooldown.
- Rate-limited per phone number:

| Code | Status | Condition |
|------|--------|-----------|
| `OTP_COOLDOWN` | 422 | Another code was requested < `OTP_RESEND_COOLDOWN_SECONDS` ago (default 30s) |
| `OTP_RATE_LIMITED` | 422 | More than `OTP_MAX_REQUESTS_PER_HOUR` codes in the last hour (default 5) |

Both carry `details.retry_after_seconds`. Throttling is skipped while
`AUTH_BYPASS_OTP=true`, since no SMS is sent in that mode.

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
- When **both** `lat` and `lng` are supplied, results are sorted nearest-first and
  each item gains a `distance_km` field (2 decimals). Without them, results are
  sorted newest-first and `distance_km` is absent. Distance sorting uses a
  `2dsphere` index on a GeoJSON `location` field derived from each ground's
  latitude/longitude.

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

### 7.3b Ground detail (owner)

`GET /owner/grounds/{groundId}`

**Auth:** Bearer (ground_owner)

Same shape as §3.2, but scoped to the caller's own grounds — and unlike the public
route it also returns grounds that are `pending_verification`, `inactive`, or
`suspended`. The owner app uses this everywhere it needs a single ground.

---

### 7.4 Slots (owner)

Owners manage slots on their own grounds through the same operations managers use,
under the `/owner` prefix:

| Method | Path | Equivalent |
|--------|------|------------|
| GET | `/owner/grounds/{groundId}/slots?date=&from=&to=` | §6.2 |
| PATCH | `/owner/grounds/{groundId}/slots/{slotId}` | §6.3 |
| POST | `/owner/grounds/{groundId}/slots/apply` | §6.4 |

**Auth:** Bearer (ground_owner). Authorization is by ground ownership rather than
manager assignment; everything else — request bodies, validation, error codes — is
identical.

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

- If a user with that phone exists, they're assigned and promoted to `manager`.
- If not, the row is stored against the phone alone (`manager_id: null`,
  `is_pending_signup: true`) and resolves to a real user on their first OTP login.
  Several such invites can coexist on one ground.
- Re-assigning an already-active phone returns `409 MANAGER_ALREADY_ASSIGNED`.

`DELETE /owner/grounds/{groundId}/managers/{managerId}`

Deactivates the assignment. The path segment accepts **either** the manager's user id
**or** the assignment's own `id` — a pending invite has no user id to reference. When
the removed manager has no other active assignments, their role drops back to `player`.

**Note:** the list endpoint returns inactive assignments too (they stay auditable);
filter on `is_active` for display.

### ManagerAssignment

```typescript
{
  id: string;
  ground_id: string;
  ground_name: string;
  ground_area: string;
  ground_city: string;
  manager_id: string | null;      // null until the invited phone signs up
  manager_name: string | null;
  manager_phone: string;
  is_active: boolean;
  is_pending_signup: boolean;     // true while manager_id is null
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

## 8. Admin

All routes require `role: admin`. Anything else gets `403 FORBIDDEN`.

### 8.1 Platform analytics

`GET /admin/analytics?period=today|week|month`

**Response `data`:**

```json
{
  "period": "week",
  "totals": {
    "players": 128, "managers": 9, "owners": 6,
    "grounds_active": 14, "grounds_pending": 2, "grounds_suspended": 1,
    "bookings_total": 902, "reviews_total": 210, "reviews_hidden": 3
  },
  "period_metrics": { "bookings": 61, "gross_value": 244000, "collected": 180500 },
  "booking_status_breakdown": { "confirmed": 22, "completed": 31, "cancelled": 5, "no_show": 3 },
  "daily_volume": [{ "date": "2026-05-14", "count": 9 }],
  "top_grounds": [
    { "ground_id": "...", "ground_name": "Champions Cricket Ground", "bookings": 24, "revenue": 96000 }
  ]
}
```

### 8.2 List grounds

`GET /admin/grounds?status=&search=&limit=20&offset=0`

`status` accepts a comma-separated list of `pending_verification | active | inactive | suspended`;
an unknown value returns `400 VALIDATION_ERROR`. Results are ordered so the
pending-verification queue comes first.

Each item is a `Ground` plus `owner_name`, `owner_phone`, `manager_count`, `booking_count`.

### 8.3 Verify a ground

`PATCH /admin/grounds/{ground_id}/verify`

**Body:** `{ "approve": true }` or `{ "approve": false, "reason": "Photos are unclear" }`

`reason` is **required** when rejecting (`400` otherwise). Approving sets `status: "active"`
and stamps `verified_at`; rejecting sets `status: "inactive"` and stores `rejection_reason`.
The owner receives a push notification either way.

### 8.4 Set ground status

`PATCH /admin/grounds/{ground_id}`

**Body:** `{ "status": "suspended", "reason": "Under audit" }`

Used for suspend/restore outside the verification flow.

### 8.5 List users

`GET /admin/users?role=&search=&limit=20&offset=0`

`role` accepts a comma-separated list of `player | manager | ground_owner | admin`.
`search` matches name or phone. Each item is a `User` plus `is_suspended`, `deleted_at`,
and either `ground_count` (owners) or `booking_count` (players).

### 8.6 Update a user

`PATCH /admin/users/{user_id}`

**Body:** `{ "role": "ground_owner" }` and/or `{ "is_suspended": true }` (at least one).

- Suspending deletes the user's refresh tokens; every subsequent API call returns
  `403 FORBIDDEN` and `/auth/verify-otp` refuses the login.
- Demoting a `manager` deactivates their ground assignments — otherwise they'd keep
  ground access without the role.
- Admins cannot change their own role or status (`422 CANNOT_MODIFY_SELF`).

This is also how the first `ground_owner` is created; there is no owner self-signup.

### 8.7 Review moderation

`GET /admin/reviews?ground_id=&visible=&limit=20&offset=0` — items are `Review` plus `ground_name`.

`PATCH /admin/reviews/{review_id}` with `{ "is_visible": false }` hides a review.
Hiding or restoring recalculates the ground's `avg_rating` / `review_count`, since
hidden reviews are excluded from both.

---

## 9. Push notifications

The mobile app registers an **Expo push token** via `PATCH /users/me` (`fcm_token`),
so the server sends through Expo's push service, which fans out to FCM/APNs.
Sends are best-effort and never block the request that triggered them; set
`PUSH_ENABLED=false` to disable.

Each payload carries a `type` plus the relevant id; the client maps that to a
destination screen (`src/utils/notificationRoutes.ts`).

| Event | `type` | Audience |
|-------|--------|----------|
| Payment cleared, booking confirmed | `booking_confirmed` | Player |
| New booking on your ground | `booking_created` | Owner + assigned managers |
| Booking cancelled | `booking_cancelled` | Player, owner + managers |
| Booking completed (prompts a review) | `booking_completed` | Player |
| Assigned as ground manager | `manager_assigned` | Manager |
| Ground approved / rejected / suspended | `ground_status` | Owner |
| Ground replied to your review | `review_reply` | Player |

Not yet implemented: booking reminders ahead of a slot, and payment-failure notices
(the gateway integration is still stubbed).

---

## 10. Cross-cutting business rules

### 10.1 Slot lifecycle

```
available → on_hold (booking created) → booked (payment confirmed)
available → blocked (manager/owner)
blocked → available (manager/owner)
on_hold → available (hold expired / booking cancelled)
```

**Background job (every 60s):**

1. **Hold expiry** — release holds where `hold_expires_at < now` and cancel the
   matching `on_hold` bookings with `cancellation_reason: "Hold expired"`.
2. **No-shows** — flip `confirmed` bookings to `no_show` once the slot's end time
   passed more than 2 hours ago. Without this a booking nobody checked in for stays
   `confirmed` forever and skews owner analytics. The past slot is left `booked`;
   releasing it would only make an expired slot look bookable.

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
| GET | `/owner/grounds/{id}` | Owner |
| PATCH | `/owner/grounds/{id}` | Owner |
| GET | `/owner/grounds/{id}/slots` | Owner |
| PATCH | `/owner/grounds/{id}/slots/{slotId}` | Owner |
| POST | `/owner/grounds/{id}/slots/apply` | Owner |
| GET | `/owner/grounds/{id}/managers` | Owner |
| POST | `/owner/grounds/{id}/managers` | Owner |
| DELETE | `/owner/grounds/{id}/managers/{mid}` | Owner |
| GET | `/owner/analytics` | Owner |
| GET | `/owner/grounds/{id}/reviews` | Owner |
| GET | `/admin/analytics` | Admin |
| GET | `/admin/grounds` | Admin |
| PATCH | `/admin/grounds/{id}/verify` | Admin |
| PATCH | `/admin/grounds/{id}` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/{id}` | Admin |
| GET | `/admin/reviews` | Admin |
| PATCH | `/admin/reviews/{id}` | Admin |

---

## Integration status

Every endpoint above is implemented and consumed by the mobile app — the player,
manager, owner, and admin experiences all run on live APIs, with no demo/seed
fallback left in the client.

Still outstanding, and deliberately so:

1. **Payment gateway.** `POST /payments/initiate` returns a stub `payment_url`, and the
   JazzCash/Easypaisa webhooks accept the documented body without verifying the
   gateway signature. `PAYMENT_AUTO_COMPLETE=true` settles payments immediately so
   the client's polling flow works end to end in development — **disable it in
   production** and wire the real gateway plus signature checks.
2. **SMS provider.** `request_otp` generates and stores a real OTP but nothing sends
   it. `OTP_DEBUG=true` returns it in the response and `AUTH_BYPASS_OTP=true` skips
   verification entirely. Wire a provider inside `auth_service.request_otp`, then set
   both flags to `false`.
3. **Booking reminders.** The push infrastructure is in place but there's no
   scheduled "your slot starts in 1 hour" job yet.

---

*Extend this document when new screens or API modules are added.*
