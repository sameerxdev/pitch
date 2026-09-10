# PITCH Backend — Architecture

Companion document to [README.md](./README.md) and [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md).
This file explains *how* the backend is put together and *why* each piece exists.

---

## 1. Goals

- Implement the contract in `BACKEND_API_SPEC.md`. All four roles — player, manager, ground owner, admin — run on live endpoints; the mobile app has no demo-data fallback left.
- Run self-hosted on a single VM with Docker.
- Be easy to extend for: real SMS provider, JazzCash/Easypaisa gateway wiring.

Non-goals:

- Multi-region deployment / horizontal scaling.
- Real-time transport (WebSockets/SSE). Slot freshness comes from 30s client polling; out-of-band updates go through push notifications.
- Admin web UI — administration is done from the mobile app's `(admin)` role. A web dashboard, if built, would consume the same `/admin` endpoints.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | Python 3.12 | Strong async support, fast iteration. |
| Web framework | FastAPI | OpenAPI out of the box, Pydantic-native validation, async-first. |
| Database | MongoDB 7 (via Motor) | Document model matches denormalized booking/slot shape; easy schema evolution. |
| Auth | JWT (PyJWT) | Stateless access tokens, refresh-token rotation kept in DB. |
| Validation | Pydantic v2 | Same models in OpenAPI and runtime. |
| File uploads | python-multipart + StaticFiles | Photos persisted on a Docker volume, served from `/media/...`. |
| Container | Docker + docker-compose | One command to spin up Mongo + API + uploads volume. |

Deliberately avoided:

- An ORM. Motor + light helpers keep the service code close to the document shape and avoid a leaky abstraction.
- Background-task framework (Celery/RQ). The only periodic job is hold expiry; a `asyncio.create_task` loop is enough.

---

## 3. Layered structure

```
app/
  main.py            FastAPI app, middleware, lifespan, static media mount.
  core/              Cross-cutting: settings, db client, JWT, deps, error envelope.
  schemas/           Pydantic request/response models (the API "shape").
  services/          Business logic. No HTTP types here — pure DB/domain calls.
  api/v1/            Routers (auth, users, grounds, bookings, payments, reviews,
                     manager, owner, admin).
  utils/             ObjectId helpers, file upload helpers.
  seed.py            Dev dataset seeder.
  seed_player_bookings.py  Per-player booking seeder (status variants).
```

Rules of thumb:

- **Routers stay thin.** They parse input, call a service, wrap the result with `success(...)`.
- **Services stay focused.** They take a Motor `db` handle and primitive args; they don't import FastAPI or know about routers.
- **No cross-service imports inside services** (apart from `serializers` and `notification_service`, both of which are leaves — they import nothing from `services/`). If two services need to coordinate (e.g. payment completion needs booking & slot updates), do it from the calling service in one place rather than weaving dependencies.

---

## 4. Request lifecycle

1. **Middleware:** CORS only. Bearer tokens are parsed per-endpoint (not in middleware) so we get clean per-route auth and OpenAPI security.
2. **Auth dependency:** `get_current_user` / `get_current_user_optional` decode the JWT, validate type, look up the user. Role gates (`require_player`, `require_manager`, `require_owner`, `require_admin`) layer on top.
3. **Validation:** Pydantic runs before the handler. Errors are caught by `validation_exception_handler` and converted to the standard envelope.
4. **Service call:** Handler delegates to a service in `app/services/`.
5. **Response envelope:** Every success path returns `success(data, meta?)` — `{ data, error, meta }`. Every error path raises `AppError` which `app_error_handler` formats identically. The shape is uniform regardless of HTTP method.

---

## 5. Authentication

OTP-based, phone-only. Spec defines a request → verify → JWT-pair flow.

- **OTP storage:** Hashed via SHA-256 in `otp_codes`. TTL index on `expires_at` auto-cleans.
- **Access token:** JWT, 60-min default, `sub = user_id`, `type = "access"`.
- **Refresh token:** JWT issued at verify time. Its **hash** is stored in `refresh_tokens` with the same expiry; refresh rotates the row.
- **QR token:** A separate JWT (`type = "qr"`) issued on payment completion, embedded in `booking.qr_code`. Validated on `POST /bookings/{id}/arrive` against subject, ground, and ±30 min time window.

### Dev shortcuts

Two settings make local development painless. Both are gated on env vars and documented in `README.md`:

- `OTP_DEBUG=true` → `/auth/request-otp` returns the OTP in the response.
- `AUTH_BYPASS_OTP=true` → `/auth/verify-otp` accepts *any* code. `request-otp` is a no-op. **Must be false in production.**

### Role assignment

Roles are server-decided:

- First-time login defaults to `player`.
- If an owner already invited the phone via `POST /owner/grounds/{id}/managers`, the role is upgraded to `manager` on first login (the inverse path also runs when a `player` later receives an assignment). Removing a manager's last active assignment demotes them back to `player`.
- `ground_owner` is granted by an admin via `PATCH /admin/users/{id}`.
- The first `admin` is bootstrapped via `mongosh` (`README.md` shows the one-liner); the dev seed creates one.

### Suspension

`PATCH /admin/users/{id}` with `is_suspended: true` deletes the user's refresh tokens and sets a flag that `get_current_user` checks on every request (403) and `verify_otp` checks at login. A suspended account cannot obtain new tokens or use existing ones.

---

## 6. Domain model

Collections (see [`core/database.py`](./app/core/database.py) for indexes):

| Collection | Key fields | Notes |
|---|---|---|
| `users` | `phone` (unique), `role` | One per phone. |
| `grounds` | `owner_id`, `status`, `avg_rating`, `photos[]`, `location` | Status: `pending_verification` → `active` after admin verifies. `location` is a GeoJSON Point mirroring `latitude`/`longitude`, indexed `2dsphere` to power `GET /grounds?lat=&lng=` distance sorting; it's written on create/update and backfilled at startup. |
| `slots` | `(ground_id, date, start_hour)` unique | Status drives availability: `available` → `on_hold` → `booked`. |
| `bookings` | `slot_id`, `player_id`, `qr_token` (unique sparse) | Status: `on_hold` → `confirmed` → `arrived` → `completed`. Or `cancelled` / `no_show`. |
| `payments` | `booking_id` | Per-booking; method jazzcash/easypaisa. |
| `reviews` | `booking_id` (unique) | One review per completed booking. |
| `manager_assignments` | `(ground_id, manager_id)` unique **partial**; `manager_phone` for invites | Supports inviting a phone before the user signs up. The unique index is partial on `manager_id: {$type: "objectId"}` so several unclaimed invites (all with `manager_id: null`) can coexist on one ground. |
| `otp_codes` | `phone`, `expires_at` (TTL) | Auto-removed on expiry. |
| `otp_requests` | `phone`, `expires_at` (TTL) | Sliding window behind the send throttle. |
| `refresh_tokens` | `user_id`, `token_hash` (unique), `expires_at` (TTL) | Hash stored, never the token itself. |

Denormalization choices:

- Bookings store `player_name`, `player_phone`, `ground_name`, `ground_area`, `slot_date`, `start_hour`, `end_hour` directly so manager listings don't need joins.
- `grounds.avg_rating` and `review_count` are recomputed after each review submission rather than aggregated on read.

---

## 7. Booking & slot lifecycle

```
slot.available  ─ POST /bookings ─►  slot.on_hold  + booking.on_hold
                                                       │
                                                       ├─ webhook completed ─►  slot.booked + booking.confirmed (qr issued)
                                                       │
                                                       └─ hold expires (job) ─►  slot.available + booking.cancelled
                                          
booking.confirmed  ─ POST /bookings/{id}/arrive ──────►  booking.arrived
booking.arrived    ─ POST /bookings/{id}/complete ─►  booking.completed (remainder collected)
booking.*          ─ DELETE /bookings/{id} ──────►  booking.cancelled  +  slot.available
```

The hold is atomic: `update_one({status: "available"})` flips to `on_hold` and the `modified_count` decides success. A duplicate hold attempt loses the race cleanly with `SLOT_NOT_AVAILABLE`.

A background loop in `app/services/jobs.py` runs every 60 s, releases expired holds, and cancels the matching booking with `cancellation_reason = "Hold expired"`.

---

## 8. Payment flow

The gateway integrations are stubbed deliberately; the wiring around them is real.

```
POST /payments/initiate
  ├─ create payments doc { status: pending }
  └─ return stub payment_url (replace with real gateway call)

Gateway → webhook → POST /payments/webhooks/{provider}
  ├─ verify signature  ← TODO: per-provider
  ├─ mark payment.completed
  ├─ issue QR token (signed JWT)
  ├─ booking → confirmed
  └─ slot     → booked

Client polls GET /payments/{id} every 3s until completed/failed (5 min timeout).
```

Cancellation flips the payment row to `refunded` (gateway refund itself is out of scope).

---

## 9. Error model

Every error response shares one shape:

```json
{ "data": null, "error": { "code": "SLOT_NOT_AVAILABLE", "message": "...", "details": {...} } }
```

`AppError` (`app/core/exceptions.py`) carries `(http_status, code, message, details)`. Helpers like `validation_error`, `not_found`, `business_rule` exist to keep call sites short. The HTTP status mapping mirrors the spec:

| Status | Meaning |
|---|---|
| 400 | validation failure |
| 401 | missing / invalid token |
| 403 | wrong role / not the owner of the resource |
| 404 | resource not found |
| 409 | conflict (e.g. duplicate review) |
| 422 | business rule violation |

---

## 10. File uploads

- Multipart only; field name `photos` (array).
- `app/utils/files.py` validates content-type (`image/jpeg|png|webp`), enforces per-endpoint count caps (8 for grounds, 3 for reviews), and writes random filenames into `UPLOAD_DIR`.
- The directory is bind-mounted to a Docker volume and served at `/media/...` so URLs are stable.

For production cloud storage (S3, etc.), swap `save_images` for a presigned-URL flow without changing routes.

---

## 11. Configuration

`app/core/config.py` is a `pydantic_settings.BaseSettings` reading `.env`. Two notable design choices:

- **`CORS_ORIGINS` is a raw string.** Older pydantic-settings versions tried to JSON-decode list fields from env, which broke `*`. The setting is now parsed into a list lazily via `settings.cors_origins_list`, which is version-proof.
- **Hot-toggled dev flags.** `OTP_DEBUG` and `AUTH_BYPASS_OTP` are settings (not feature flags) precisely because they shape *responses* and the local team needs them on by default. Production deployments must override both.

---

## 12. Deployment shape

`docker-compose.yml` is intentionally minimal:

- `mongo` — official `mongo:7` image, healthchecked.
- `api` — built from `Dockerfile`, depends on Mongo's healthcheck.
- Volumes: `mongo_data`, `uploads_data`.
- The `app/` directory is bind-mounted into the API container — code edits don't need a rebuild, only a `docker compose up -d` (recreates the container with the same network and reloads imports).

For a real deployment, replace the bind mount with a baked-in image, add a reverse proxy (Caddy/Nginx) with HTTPS, and front the API + media on a stable domain.

---

## 13. Where to extend

| Want to add… | Touch these files |
|---|---|
| A new endpoint | `app/schemas/<area>.py`, `app/api/v1/<area>.py`, and a service in `app/services/`. Register the router in `app/api/v1/router.py`. |
| A new collection / field | Update indexes in `app/core/database.py`, the relevant service, and the serializer in `app/services/serializers.py`. |
| Real SMS | Replace the body of `request_otp` in `app/services/auth_service.py` with the provider call; keep `verify_otp` unchanged. |
| Real gateway | Edit `payment_service.initiate_payment` to hit the gateway, and add signature verification inside the two webhook handlers in `app/api/v1/payments.py`. Set `PAYMENT_AUTO_COMPLETE=false`. |
| An admin capability | `app/services/admin_service.py` + `app/api/v1/admin.py`, guarded by `require_admin`. |
| A push notification | A `notify_*` coroutine in `app/services/notification_service.py`, fired via `notify_in_background(...)` from wherever the event happens. Add the `type` → screen mapping in the app's `src/utils/notificationRoutes.ts`. |
| A periodic job | A function taking `db`, called from the loop in `app/services/jobs.py` (see `no_show_service.mark_missed_bookings`). |

---

## 14. Things worth reading in order

If you're new to the codebase:

1. [README.md](./README.md) — how to run it.
2. [BACKEND_API_SPEC.md](./BACKEND_API_SPEC.md) — the contract.
3. `app/main.py` — wiring (lifespan, exception handlers, router mount).
4. `app/core/database.py` — index layout = data model summary.
5. `app/services/booking_service.py` — the most business-rule-dense module; everything else follows the same pattern.
