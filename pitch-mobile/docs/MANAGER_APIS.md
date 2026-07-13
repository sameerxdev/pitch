# Manager APIs (PITCH Backend)

**Base URL:** `{EXPO_PUBLIC_API_BASE_URL}` (e.g. `http://192.168.100.200:8000/api/v1`)  
**Auth:** `Authorization: Bearer <access_token>` on all routes below.

Also uses shared booking actions (same as server booking routes):

| Method | Path | Use |
|--------|------|-----|
| POST | `/bookings/{booking_id}/arrive` | QR scan / manual check-in |
| POST | `/bookings/{booking_id}/complete` | Collect remainder & complete |

---

## 1. List assigned grounds

`GET /manager/grounds`

**When:** Manager logs in with multiple grounds, or to refresh assignment list.

**Response `data`:** `ManagerGround[]`

```json
[
  {
    "id": "6a08ef8b2fa147a68c6f5f51",
    "name": "Champions Cricket Ground",
    "area": "DHA Phase 5",
    "city": "Lahore",
    "today_booking_count": 3
  }
]
```

**Mobile:** `app/(manager)/ground-select.tsx` — pick active ground. If only one ground, auto-enters tabs.

---

## 2. Slots

### List slots

`GET /manager/grounds/{ground_id}/slots?date=YYYY-MM-DD`

Optional: `from`, `to` for ranges.

**Response `data`:** `Slot[]`

**Mobile:** Home (today), Slots tab, slot manager preview.

### Update one slot

`PATCH /manager/grounds/{ground_id}/slots/{slot_id}`

**Body:** `{ "status": "blocked" | "available", "price"?: number }`

**Mobile:** Slots tab — block/unblock in preview list.

### Apply manual slots (bulk)

`POST /manager/grounds/{ground_id}/slots/apply`

**Body:**

```json
{
  "from_date": "2026-05-15",
  "to_date": "2026-05-20",
  "hourly_rate_day": 2000,
  "hourly_rate_night": 3000,
  "slots": [
    { "start_hour": 16, "end_hour": 18, "rate_type": "day" },
    { "start_hour": 18, "end_hour": 20, "rate_type": "night", "price": 6000 }
  ]
}
```

**Mobile:** Slots tab — `GroundSlotManager`.

---

## 3. Bookings

### List bookings

`GET /manager/grounds/{ground_id}/bookings?date=&status=&limit=20&offset=0`

**Response `data`:** paginated `Booking` items for **that ground only**.

**Mobile:** Bookings tab, Home (upcoming today).

### Booking detail

`GET /manager/grounds/{ground_id}/bookings/{booking_id}`

**Mobile:** `app/(manager)/booking/[id].tsx`

### Arrive (check-in)

`POST /bookings/{booking_id}/arrive`

**Body:** `{ "method": "qr", "qr_token": "..." }` or `{ "method": "manual" }`

**Mobile:** QR scanner, manual confirm on booking detail.

### Complete

`POST /bookings/{booking_id}/complete`

**Body:** `{ "payment_method": "cash"|"card"|"online", "amount_received": number }`

**Mobile:** `app/(manager)/booking/[id]/complete.tsx`

---

## 4. Reviews

`GET /manager/grounds/{ground_id}/reviews?sort=newest&limit=15&offset=0`

**Response `data`:** paginated `Review[]`

**Mobile:** Reviews tab.

---

## Multi-ground behaviour (mobile)

| Assigned grounds | Flow |
|------------------|------|
| **0** | Ground select shows empty state |
| **1** | Auto-select → manager tabs (no switch needed) |
| **2+** | Ground select list → tabs; **Switch ground** on Account (and header on Home when multiple) |

Active ground is stored in `managerStore.activeGround`. All manager API calls use `activeGround.id` as `ground_id`.
