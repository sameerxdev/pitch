# PITCH — Mobile App

Cricket ground booking platform for Pakistan. React Native (Expo) mobile app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.74 + Expo SDK 51 |
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
│   ├── (owner)/            # Analytics, ground CRUD, managers
│   └── (admin)/            # Admin read-only (Phase 2)
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
| Player | `/(player)/` | Browse, Slots, Booking, QR Gate, Reviews |
| Manager | `/(manager)/ground-select` | Home, Bookings, QR Scan, Completion, Reviews |
| Ground Owner | `/(owner)/` | Analytics, Ground CRUD, Manager Management |
| Admin | `/(admin)/` | Read-only (web dashboard is primary) |

## Self-Hosted Notes

- **No Supabase**: All data goes through the self-hosted Node.js API
- **No realtime**: Slot updates use 30s polling (`SLOT_POLL_INTERVAL_MS`)
- **No Supabase Auth**: Custom JWT stored in `expo-secure-store`
- **Payment**: JazzCash/Easypaisa via `payment_url` redirect + polling to confirm
- **QR offline**: JWT token cached in SecureStore at booking confirmation

## Development Roadmap

See `PITCH-MOBILE-PLAN.md` for the full 12-sprint implementation plan.

### Phase 1 (Weeks 1–6) — Core Booking
Auth → Browse → Slot Calendar → Booking → QR → Manager Scan

### Phase 2 (Weeks 7–9) — Reviews
Review submission → Manager replies → Rating triggers

### Phase 3 (Weeks 10–13) — Analytics & Polish
Owner analytics → Map view → Cancellations → Performance
