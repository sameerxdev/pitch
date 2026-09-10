# PITCH — Mobile App

Cricket ground booking platform for Pakistan. React Native (Expo) mobile app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript (strict mode) |
| Routing | Expo Router (file-based) |
| State | Zustand (auth/manager) + TanStack Query (server state) |
| HTTP | Axios (custom JWT interceptor) |
| Styling | NativeWind (Tailwind CSS) |
| Auth | Custom JWT via SecureStore (no Supabase) |
| Payments | JazzCash + Easypaisa (payment_url redirect) |
| Push | Firebase Cloud Messaging (FCM) |
| QR | react-native-qrcode-svg + offline cache in SecureStore |

## Setup

```bash
cd pitch-mobile

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env with your backend API URL

# Start dev server
npx expo start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Your self-hosted API base URL (e.g. `http://192.168.1.x:8000/api/v1`) |

## Project Structure

```
pitch-mobile/
├── app/                    # Expo Router file-based screens
│   ├── _layout.tsx         # Root layout + auth gate
│   ├── (auth)/             # Login, OTP, profile setup
│   ├── (player)/           # Browse, slot booking, QR, reviews
│   ├── (manager)/          # Slot management, QR scan, completion
│   ├── (owner)/            # Analytics, ground CRUD, slots, managers
│   └── (admin)/            # Platform overview, verification, users, moderation
├── src/
│   ├── api/                # Axios API modules + TypeScript types
│   ├── stores/             # Zustand stores (auth, manager)
│   ├── hooks/              # TanStack Query hooks
│   ├── components/         # Reusable UI and domain components
│   ├── utils/              # format, validators, storage, notifications
│   └── constants/          # colors, routes, config
└── assets/                 # Fonts, images
```

## User Roles

| Role | Entry Point | Key Screens |
|------|------------|-------------|
| Player | `/(player)/` | Browse, Slots, Booking, Pay, QR Gate, Reviews |
| Manager | `/(manager)/ground-select` | Home, Bookings, Slots, QR Scan, Completion, Reviews |
| Ground Owner | `/(owner)/` | Analytics, Ground CRUD, Slots, Manager Management, Reviews |
| Admin | `/(admin)/` | Platform overview, Ground verification, Users, Review moderation |

All four roles run entirely on the live API — there is no demo/seed data path in
the app. Point `EXPO_PUBLIC_API_BASE_URL` at a running `pitch-backend` and sign in.

## Self-Hosted Notes

- **No Supabase**: All data goes through the self-hosted FastAPI backend
- **No realtime**: Slot updates use 30s polling (`SLOT_POLL_INTERVAL_MS`)
- **No Supabase Auth**: Custom JWT stored in `expo-secure-store`
- **Payment**: JazzCash/Easypaisa via `payment_url` redirect + polling to confirm.
  The gateway itself is still stubbed server-side — see the backend README.
- **QR offline**: JWT token cached in SecureStore at booking confirmation
- **Push**: an Expo push token is registered via `PATCH /users/me`; the backend
  sends booking/ground events through Expo. Tap-through routing lives in
  `src/utils/notificationRoutes.ts`.

## Signing in during development

The backend ships with `AUTH_BYPASS_OTP=true`, so any 6-digit code works. After
running its seeder (`docker compose exec api python -m app.seed`):

| Role | Phone |
|------|-------|
| Admin | `+923000000001` |
| Ground owner | `+923000000002` |
| Manager | `+923000000003` |
| Player | `+923000000005` |

`PERSIST_AUTH_SESSION` is `false` in `src/constants/config.ts`, so the app opens at
the phone-entry screen on each cold start. Set it to `true` for production.
