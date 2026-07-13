# PITCH Mobile — Architecture

Companion document to [README.md](./README.md), [docs/BACKEND_API_SPEC.md](./docs/BACKEND_API_SPEC.md),
and [docs/MANAGER_APIS.md](./docs/MANAGER_APIS.md). This file explains *how* the app
is structured and *why* each piece is where it is.

---

## 1. Goals

- A single Expo app that serves four distinct experiences — **player**, **manager**, **ground owner**, **admin** — without duplicating navigation, theming, or networking code.
- Demo-mode out of the box (seed data + role picker) so design/UX iterations don't need a live backend.
- Easy to flip to live APIs once the backend is reachable (one env var + swap a few demo hooks).

Non-goals:

- Web parity (Expo web builds run, but the product targets iOS/Android).
- Server-driven UI / dynamic forms — screens are hand-built.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 54 + React Native 0.81 | Managed workflow, OTA updates, native module ecosystem. |
| Navigation | Expo Router 6 (file-based) | Route groups encode role boundaries; deep linking works for free. |
| Styling | NativeWind 4 (Tailwind) | Class-string DX, no runtime stylesheet plumbing. |
| Server state | TanStack Query v5 | Caching, retries, polling (used for payment status + slot refresh). |
| Client state | Zustand | Tiny, no provider tree, fits auth/session needs. |
| Forms | react-hook-form + zod | Inline validation, same schemas usable on backend later. |
| HTTP | axios | Interceptors for auth header + refresh-token rotation. |
| Persistent storage | expo-secure-store | Stores access/refresh tokens encrypted at rest. |
| QR | expo-camera + react-native-qrcode-svg | Camera scan for managers, SVG render for players. |
| Maps | react-native-maps | Ground location pickers and detail screens. |
| Charts | victory-native | Owner analytics dashboard. |
| Push | expo-notifications | Registers an FCM token via `PATCH /users/me`. |

Deliberately avoided:

- Redux / Redux Toolkit — too much ceremony for what amounts to "logged-in user + flags".
- Server-state libs other than React Query — single source of truth for cache + invalidation.

---

## 3. Directory layout

```
app/                       Expo Router file system (routes only).
  _layout.tsx              Root layout: providers, splash handling, theme.
  (auth)/                  Login flow — phone → OTP → profile setup.
  (player)/                Player tabs: explore, bookings, profile, etc.
  (manager)/               Manager screens: ground select, QR scanner, bookings.
  (owner)/                 Owner screens: grounds, slots, managers, analytics.
  (admin)/                 Admin placeholder (phase 2).
src/
  api/                     Axios client + per-area API modules (auth, grounds, bookings…).
  components/              Reusable UI building blocks, grouped by domain.
    booking/               Booking cards, QR sheet, status chips.
    ground/                Ground card, image carousel, facilities row.
    manager/               Manager-specific panels.
    owner/                 Owner-specific panels.
    slot/                  Slot grid, hourly picker, status pills.
    ui/                    Cross-cutting primitives (buttons, inputs, modals).
  constants/               `config.ts`, route names, Pakistan cities, etc.
  data/                    Demo/seed data used when API is offline.
  hooks/                   React Query hooks (slotDemo, ownerDemo, managerDemo …).
  stores/                  Zustand stores (auth/session, UI flags).
  utils/                   Date/number helpers, advance calculator, formatters.
```

Two patterns to internalize before touching code:

- **File-based routes mirror role boundaries.** Anything inside `(role)/` is gated to that role by the layout's auth guard. Wrong role → redirect.
- **`src/api/*` and `src/hooks/*` are paired.** The API module is pure axios + types. The hook is the React Query wrapper. UI components use the hook, never the API module directly.

---

## 4. Navigation model

Expo Router treats `app/(group)/` as a route group — the parentheses don't appear in URLs but they let each group own its own layout.

- `app/_layout.tsx` mounts the React Query provider, NativeWind, error boundaries, and the splash screen.
- Each role's `_layout.tsx` checks the current session (`useAuthStore`) and redirects if the role mismatches. Players landing on `(manager)/scan` get bounced to `(player)/index`.
- The `(auth)/` group is the only one accessible to unauthenticated users; everything else redirects to `(auth)/` when the token is missing or expired.

Deep linking works thanks to Expo Router — `expo-linking://bookings/abc123` opens `(player)/bookings/abc123` if the user is a logged-in player.

---

## 5. Auth & session

- On `(auth)/index.tsx`, the user enters a phone number → `POST /auth/request-otp` → `(auth)/otp.tsx` prompts for the code → `POST /auth/verify-otp` returns `{ access_token, refresh_token, user }`.
- Tokens are stored with **expo-secure-store** (encrypted on iOS Keychain / Android Keystore). The in-memory copy lives in a Zustand store.
- The axios client (`src/api/client.ts`) installs two interceptors:
  - **Request:** attach `Authorization: Bearer <access>`.
  - **Response:** on 401, attempt one `POST /auth/refresh` using the stored refresh token. Success → replay the original request. Failure → wipe tokens and route to `(auth)/index`.
- The demo build (`config.DEMO_MODE = true`) skips the network and seeds a user from `src/data/` so designers can iterate without a backend.

If the user's `full_name` is null after verify, `(auth)/profile-setup.tsx` collects name + city and calls `PATCH /users/me` before letting them into the app.

---

## 6. Server state (TanStack Query)

A few conventions worth knowing:

- Query keys mirror REST paths: `["grounds", { city, search }]`, `["grounds", id, "slots", { date }]`, `["bookings", { status }]`.
- **Mutations always `invalidateQueries` for their domain** — `createBooking` invalidates `["bookings"]` and the affected slot list so the slot grid recolors immediately.
- **Polling lives in hooks, not screens.** Payment polling (every 3 s, 5 min cap), slot refresh (30 s), booking status — all wrapped in dedicated hooks that the screen just consumes.
- **Demo hooks** (`useSlotsDemo`, `useOwnerAnalyticsDemo`, etc.) return the same shape as the live hooks, so swapping is mechanical — change one import.

Cache strategy: `staleTime` defaults to 30 seconds, `gcTime` to 5 minutes. Long-lived data (ground listings) bumps `staleTime` up; payment status sets it to 0.

---

## 7. Forms & validation

- Every form is `react-hook-form` + `zod` resolver via `@hookform/resolvers`.
- Schemas live next to the form, not in a shared file — they're tiny and rarely reused.
- Phone numbers use a Pakistan-only regex (`+92` + 10 digits starting with 3) that matches the backend's validator exactly.
- Errors are rendered via a shared `<FormField />` primitive in `src/components/ui/`.

---

## 8. Player flow

```
explore ──► ground detail ──► slot picker ──► booking summary ──► pay
                                                  │
                                                  └─ on success ─► booking detail (QR shown here)
bookings tab lists confirmed/arrived/completed/cancelled bookings.
```

- **Slot picker** uses the slot grid component, color-coded by status. Only `available` slots are tappable. The 14-day window comes straight from the backend response.
- **Pay screen** opens the gateway URL via `expo-linking`, then starts a TanStack Query poll on `GET /payments/{id}`. On `completed`, it routes to the booking detail screen which renders the QR.
- **Cached confirmed bookings** live in expo-secure-store too, so the QR is visible without network at the ground.

---

## 9. Manager flow

```
ground-select ──► home (today's bookings) ──► booking detail
                                    │
                                    ├─ scan (QR camera) ──► arrive
                                    └─ manual check-in ──► arrive
arrived booking ──► complete (collect remainder)
```

- The camera screen (`(manager)/scan.tsx`) uses `expo-camera`. On a successful scan it posts to `/bookings/{id}/arrive` with `method: "qr"`. Time-window and ground-mismatch errors are surfaced as toasts.
- Manual check-in is the fallback path with `method: "manual"`.
- The slot management UI uses the same `slots/apply` bulk endpoint as the owner.

---

## 10. Owner flow

```
grounds list ──► ground edit (photos, rates, facilities)
            ├──► slots/apply (date range × time templates)
            ├──► managers (assign by phone, remove)
            └──► analytics (period: today/week/month, per-ground breakdown)
```

- The photo picker uses `expo-image-picker` and uploads via multipart.
- The slots/apply form is the densest screen — it generates the same payload shape the backend expects from `POST /owner/grounds/{id}/slots/apply`.
- Analytics is rendered with victory-native; trend %, daily volume, and per-ground rows come straight from the backend.

---

## 11. Configuration

`src/constants/config.ts` centralizes everything tunable:

- `EXPO_PUBLIC_API_BASE_URL` — base URL for the backend (`{API_HOST}/api/v1`).
- `DEMO_MODE` — when true, all hooks return seed data.
- `PERSIST_AUTH_SESSION` — disable for dev wipe-on-restart, enable for production.
- Polling intervals (`PAYMENT_POLL_INTERVAL_MS`, `SLOT_POLL_INTERVAL_MS`) so timing changes live in one place.
- Business constants mirrored from the spec (`MAX_GROUND_PHOTOS`, `MAX_REVIEW_PHOTOS`, `QR_SCAN_WINDOW_MINUTES`, `PLAYER_MAX_BOOKING_DAYS_AHEAD`).

When switching from demo to live, you typically touch only:

1. `EXPO_PUBLIC_API_BASE_URL` (in `.env`).
2. `DEMO_MODE = false`.
3. `PERSIST_AUTH_SESSION = true`.

---

## 12. Styling & theming

- NativeWind 4 with the standard Tailwind config (`tailwind.config.js`) plus a small `theme` extension for brand colors.
- A few hard-coded constants — touch-target sizes, brand greens — live in `src/constants/` rather than Tailwind classes so they can be referenced from non-styling code (e.g., chart fill colors).
- Dark mode follows the system color scheme via NativeWind's `dark:` variants. Screens that paint native widgets (camera, maps) opt out where needed.

---

## 13. Permissions matrix

| Feature | Permission |
|---|---|
| Manager QR scan | Camera (`expo-camera`) |
| Owner photo upload | Photo library (`expo-image-picker`) |
| Maps + ground location | Foreground location (`expo-location`) |
| Push notifications | Notifications (`expo-notifications`) |
| QR brightness boost | `expo-brightness` |

Permissions are requested lazily, just before the feature is used, with a soft pre-prompt explaining the reason.

---

## 14. Where to extend

| Want to add… | Touch these files |
|---|---|
| A new screen | A new file under `app/(role)/`. Use existing `_layout.tsx` for tab/stack registration. |
| A new API call | `src/api/<area>.ts` (axios + types) + `src/hooks/use<X>.ts` (React Query wrapper). Use the hook in the screen. |
| A new shared component | `src/components/<domain>/` if it's domain-specific; `src/components/ui/` if cross-cutting. |
| Demo data for a screen | Add to `src/data/`, mirror it in a `*Demo` hook in `src/hooks/`. |
| A push notification handler | Wire it up in `app/_layout.tsx` where `expo-notifications` is initialized. |

---

## 15. Reading order for newcomers

1. [README.md](./README.md) — how to run it.
2. [docs/BACKEND_API_SPEC.md](./docs/BACKEND_API_SPEC.md) — the contract.
3. `src/constants/config.ts` — what's tunable.
4. `app/_layout.tsx` — root providers and the auth guard pattern.
5. `src/api/client.ts` + `src/hooks/useBookings.ts` — the canonical API/hook pair, every other one follows this shape.
6. `app/(player)/bookings.tsx` — the most representative screen, exercises forms, lists, polling, and navigation in one place.
