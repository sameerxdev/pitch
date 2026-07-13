# PITCH Backend

Self-hosted backend for the **PITCH** mobile app. Implements the contract documented in
[`BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md).

- **Stack:** Python 3.12, FastAPI, MongoDB (Motor async driver), JWT auth, Pydantic v2
- **Runtime:** Docker + docker-compose (API + MongoDB)
- **Base URL:** `http://localhost:8000/api/v1`
- **Interactive docs:** `http://localhost:8000/docs`

---

## Quick start (Docker)

```bash
cd pitch-backend
cp .env.example .env
docker compose up --build
```

This starts:

- `pitch-api`  → FastAPI on `:8000`
- `pitch-mongo` → MongoDB on `:27017`

Health check:

```bash
curl http://localhost:8000/health
```

Uploaded photos are served from `http://localhost:8000/media/...` and persisted in
a Docker volume (`uploads_data`).

---

## Local (non-Docker) development

```bash
cd pitch-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# point at your own Mongo
export MONGO_URI=mongodb://localhost:27017
export MONGO_DB=pitch
export UPLOAD_DIR=$(pwd)/uploads

uvicorn app.main:app --reload --port 8000
```

---

## Project layout

```
app/
  main.py                   FastAPI app + lifespan
  core/
    config.py               Settings (env-driven)
    database.py             Mongo client + index bootstrap
    security.py             JWT + token helpers (access, refresh, QR)
    dependencies.py         get_current_user, role gates
    envelope.py             { data, error, meta } response/error formatters
    exceptions.py           AppError + shortcuts
  schemas/                  Pydantic request/response models
  services/                 Business logic (auth, slots, bookings, payments, reviews, ...)
  api/v1/                   Routers (auth, users, grounds, bookings, payments, reviews, manager, owner)
  utils/
    ids.py                  ObjectId helpers
    files.py                Image upload handling
```

All endpoints are mounted under `${API_V1_PREFIX}` (default `/api/v1`).

---

## Authentication flow

1. `POST /api/v1/auth/request-otp` with `{ "phone": "+923001234567" }`.
   - Generates a 6-digit OTP. In **development** the OTP is returned in the
     response as `debug_otp` (controlled by `OTP_DEBUG`). In production wire a
     real SMS provider and remove that field.
2. `POST /api/v1/auth/verify-otp` with `{ "phone": "...", "otp": "123456" }`.
   - On first verification a `users` record is created with role `player`
     (auto-promoted to `manager` if the owner has already issued an assignment
     against the phone).
   - Returns `{ access_token, refresh_token, user }`.
3. Send `Authorization: Bearer <access_token>` on subsequent calls.
4. Refresh via `POST /api/v1/auth/refresh` with the refresh token. The previous
   refresh token is invalidated on rotation.

### Promoting a user to `ground_owner`

The mobile app does not provide an owner self-signup endpoint. To bootstrap an
owner (e.g. for the first deployment), promote an existing user via Mongo:

```bash
docker compose exec mongo mongosh pitch \
  --eval 'db.users.updateOne({ phone: "+923001234567" }, { $set: { role: "ground_owner" } })'
```

Managers are assigned implicitly: when an owner calls
`POST /owner/grounds/{id}/managers` with a phone, the user is created (if
needed) with role `manager` on next OTP verification.

---

## Slot lifecycle & background jobs

```
available → on_hold  (POST /bookings)
on_hold   → available (hold expires or POST /bookings/{id} DELETE)
on_hold   → booked   (payment webhook completes)
available ↔ blocked  (manager / owner)
```

A background task (see `app/services/jobs.py`) runs every 60 seconds and:

- Releases slot holds whose `hold_expires_at` is in the past
- Cancels the matching booking with `cancellation_reason = "Hold expired"`

---

## Payments

`POST /payments/initiate` creates a payment record and returns a stub
`payment_url`. In production, wire JazzCash/Easypaisa here and let their
gateway hit:

- `POST /api/v1/payments/webhooks/jazzcash`
- `POST /api/v1/payments/webhooks/easypaisa`

with `{ payment_id, gateway_txn_id, status, signature }`. **Signature
verification is left as a TODO** — implement per the gateway's docs.

On webhook `status: "completed"` the server:

1. Marks payment `completed`
2. Issues a signed QR token (`booking.qr_token` / `booking.qr_code`)
3. Transitions booking → `confirmed`
4. Transitions slot → `booked`

The client polls `GET /payments/{payment_id}` every 3s (timeout 5 min) until
status is `completed` or `failed`.

---

## QR check-in

Managers scan the player's QR token and call:

```
POST /api/v1/bookings/{booking_id}/arrive
{ "method": "qr", "qr_token": "<token from QR>" }
```

The server validates:

| Code                       | Condition                                            |
|----------------------------|------------------------------------------------------|
| `INVALID_QR_TOKEN`         | Token signature/subject mismatch                     |
| `QR_WRONG_GROUND`          | Token issued for a different ground                  |
| `QR_OUTSIDE_TIME_WINDOW`   | Outside ±30 min of slot start                        |
| `ARRIVAL_ALREADY_CONFIRMED`| Booking already `arrived`                            |

Manual check-in uses the same endpoint with `method: "manual"` (no token).

Then complete the booking with collected remainder:

```
POST /api/v1/bookings/{booking_id}/complete
{ "payment_method": "cash", "amount_received": 4000 }
```

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | Free-form |
| `API_V1_PREFIX` | `/api/v1` | Route prefix |
| `CORS_ORIGINS` | `*` | Comma-separated list |
| `MONGO_URI` | `mongodb://mongo:27017` | Mongo connection string |
| `MONGO_DB` | `pitch` | Database name |
| `JWT_SECRET` | `change_me...` | **Override in production** |
| `ACCESS_TOKEN_TTL_MINUTES` | `60` | |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | |
| `OTP_LENGTH` | `6` | |
| `OTP_TTL_SECONDS` | `300` | |
| `OTP_MAX_ATTEMPTS` | `3` | Lockout after this many wrong tries |
| `OTP_DEBUG` | `true` | Return generated OTP in response (dev only) |
| `HOLD_DURATION_SECONDS` | `600` | 10 min hold window |
| `PLAYER_MAX_BOOKING_DAYS_AHEAD` | `14` | |
| `QR_SCAN_WINDOW_MINUTES` | `30` | |
| `MAX_GROUND_PHOTOS` | `8` | |
| `MAX_REVIEW_PHOTOS` | `3` | |
| `UPLOAD_DIR` | `/data/uploads` | Persisted via Docker volume |
| `PUBLIC_MEDIA_BASE_URL` | `http://localhost:8000/media` | Used in returned photo URLs |

---

## Endpoint index

All endpoints match the contract in [`BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md). Highlights:

- **Auth**: `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`
- **Users**: `GET/PATCH/DELETE /users/me`
- **Player browse**: `GET /grounds`, `GET /grounds/{id}`, `GET /grounds/{id}/slots`, `GET /grounds/{id}/reviews`
- **Player bookings**: `POST/GET /bookings`, `GET/DELETE /bookings/{id}`
- **Payments**: `POST /payments/initiate`, `GET /payments/{id}`, `POST /payments/webhooks/{provider}`
- **Reviews**: `POST /reviews`, `POST /reviews/{id}/reply`
- **Manager**: `GET /manager/grounds`, `GET/PATCH /manager/grounds/{id}/slots[...]`, `POST /manager/grounds/{id}/slots/apply`, `GET /manager/grounds/{id}/bookings[/{bid}]`, `POST /bookings/{id}/arrive`, `POST /bookings/{id}/complete`, `GET /manager/grounds/{id}/reviews`
- **Owner**: `GET/POST /owner/grounds`, `PATCH /owner/grounds/{id}`, `POST /owner/grounds/{id}/slots/apply`, `GET/POST/DELETE /owner/grounds/{id}/managers[...]`, `GET /owner/analytics`, `GET /owner/grounds/{id}/reviews`

Open `/docs` for the full interactive schema.

---

## Data model (Mongo collections)

| Collection | Notes |
|---|---|
| `users` | `phone` unique, `role` |
| `grounds` | `owner_id`, `status`, rates, geo, `photos[]`, `facilities[]` |
| `slots` | unique `(ground_id, date, start_hour)`; status, price, hold_expires_at |
| `bookings` | per-slot booking; `qr_token` (unique sparse), `status` |
| `payments` | per-booking; `status` |
| `reviews` | per-booking unique; ratings + reply |
| `manager_assignments` | unique `(ground_id, manager_id)`; supports phone-only invites |
| `otp_codes` | per-phone, TTL via `expires_at` index |
| `refresh_tokens` | per-user, TTL via `expires_at` index |

Indexes are created automatically on startup (see `app/core/database.py`).

---

## Notes & limitations

- **Admin endpoints** are intentionally not implemented in this phase. The
  spec marks them as phase 2.
- **SMS provider** is not wired. Replace the `request_otp` service with your
  provider's send call and disable `OTP_DEBUG`.
- **Payment gateways** are stubbed. The webhook endpoints accept the documented
  body shape but do not verify gateway signatures. Wire signature verification
  before going live.
- **Distance-based sort** on `/grounds` is documented but not implemented; the
  list endpoint accepts `lat`/`lng` and ignores them. Add a 2dsphere index if
  needed.
