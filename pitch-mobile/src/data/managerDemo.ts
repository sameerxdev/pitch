/**
 * Manager dashboard demo — mirrors player seed data, no HTTP.
 * TODO: Remove when manager API is wired.
 */
import { format } from "date-fns";
import type {
  Booking,
  ManagerGround,
  PaginatedResponse,
  Review,
  Slot,
} from "@/api/types";
import {
  SEED_BOOKINGS,
  SEED_GROUNDS,
  SEED_REVIEWS,
} from "@/data/seedData";
import { getSlotsForGroundDate } from "@/data/slotDemo";
import { useManagerDemoStore } from "@/stores/managerDemoStore";

const DEFAULT_PLAYER_PHONE = "+92 300 1234567";

/** Demo names when `player_name` is absent from seed/API (stable per booking id). */
const DEMO_PLAYER_NAME_POOL = [
  "Ahmed Raza",
  "Bilal Khan",
  "Sara Malik",
  "Omar Butt",
  "Usman Ali",
  "Hina Tariq",
  "Rehan Saleem",
  "Hassan Mirza",
  "Farhan Siddiqui",
  "Nauman Iqbal",
  "Zain ul Abideen",
  "Mariam Hussain",
  "Kamran Akmal",
  "Ayesha Noor",
  "Taha Mahmood",
  "Danish Ali",
  "Fizza Khan",
  "Waleed Akhtar",
  "Sana Irfan",
  "Babar Javed",
] as const;

function demoPlayerNameForBooking(b: Booking): string {
  let h = 0;
  for (let i = 0; i < b.id.length; i++) {
    h = (h * 31 + b.id.charCodeAt(i)) >>> 0;
  }
  return DEMO_PLAYER_NAME_POOL[h % DEMO_PLAYER_NAME_POOL.length] ?? "Player";
}

const DHA_TODAY_PLAYER_NAMES = DEMO_PLAYER_NAME_POOL.slice(0, 15);

function timeFractionInDay(d: Date): number {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/** Half-open [start_hour, end_hour): only one index can be "current" at a time. */
function indexOfLiveHourlySlot(now: Date, firstStart: number, count: number): number | null {
  const t = timeFractionInDay(now);
  for (let i = 0; i < count; i++) {
    const start = firstStart + i;
    const end = start + 1;
    if (t >= start && t < end) return i;
  }
  return null;
}

/** Demo-only: many same-day rows; at most one `arrived` — the slot that contains "now". */
function buildDhaGroundATodayBookings(today: string, nowIso: string): Booking[] {
  const now = new Date();
  const liveIndex = indexOfLiveHourlySlot(now, 6, 15);
  const cancelReasons = [
    "Team lineup changed",
    "Weather concerns",
    "Player injured",
  ];
  return Array.from({ length: 15 }, (_, i) => {
    const start_hour = 6 + i;
    const end_hour = 7 + i;
    const night = start_hour >= 18;
    const total_price = night ? 9000 : 7000;
    const advance_amount = night ? 2700 : 2100;
    const id = `b-today-dha-${String(i + 1).padStart(2, "0")}`;
    const t = timeFractionInDay(now);
    const slotEnded = t >= end_hour;
    const cancelledDemo = (i === 12 || i === 13 || i === 14) && i !== liveIndex;
    let status: Booking["status"];
    if (cancelledDemo) status = "cancelled";
    else if (liveIndex !== null && i === liveIndex) status = "arrived";
    else if (slotEnded) status = "completed";
    else status = "confirmed";

    const base: Booking = {
      id,
      slot_id: `s-today-dha-${String(i + 1).padStart(2, "0")}`,
      player_id: "demo-user-id",
      player_name: DHA_TODAY_PLAYER_NAMES[i],
      player_phone: `+92 310 ${String(1000000 + i).slice(0, 7)}`,
      ground_id: "g-001",
      ground_name: "DHA Sports Complex – Ground A",
      ground_area: "DHA Phase 5",
      slot_date: today,
      start_hour,
      end_hour,
      status,
      total_price,
      advance_amount,
      qr_code: `PITCH-DHA-TODAY-${String(i + 1).padStart(2, "0")}`,
      arrived_at: null,
      completion_payment_method: null,
      remainder_collected: 0,
      review_submitted: false,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: new Date(Date.now() - (15 - i) * 60_000).toISOString(),
    };
    if (status === "arrived") {
      base.arrived_at = nowIso;
    }
    if (status === "completed") {
      base.arrived_at = new Date(Date.now() - 3600_000).toISOString();
      base.completion_payment_method = i % 2 === 0 ? "cash" : "bank_transfer";
      base.remainder_collected = total_price - advance_amount;
      base.review_submitted = i % 3 === 0;
    }
    if (status === "cancelled") {
      base.qr_code = null;
      base.cancelled_at = new Date(Date.now() - 7200_000).toISOString();
      base.cancellation_reason =
        cancelReasons[i % cancelReasons.length] ?? "Cancelled by player";
    }
    return base;
  });
}

function buildRuntimeTodayBookings(): Booking[] {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const nowIso = now.toISOString();
  const t = timeFractionInDay(now);
  const joharStart = 10;
  const joharEnd = 12;
  const joharTotal = 5600;
  const joharAdvance = 1400;
  let joharStatus: Booking["status"];
  let joharArrivedAt: string | null = null;
  let joharCompletion: Booking["completion_payment_method"] = null;
  let joharRemainder = 0;
  if (t >= joharStart && t < joharEnd) {
    joharStatus = "arrived";
    joharArrivedAt = nowIso;
  } else if (t >= joharEnd) {
    joharStatus = "completed";
    joharArrivedAt = new Date(now.getTime() - 3600_000).toISOString();
    joharCompletion = "cash";
    joharRemainder = joharTotal - joharAdvance;
  } else {
    joharStatus = "confirmed";
  }
  return [
    ...buildDhaGroundATodayBookings(today, nowIso),
    {
      id: "b-today-002",
      slot_id: "s-today-2",
      player_id: "demo-user-id",
      player_name: "Iram Sheikh",
      player_phone: "+92 301 4445566",
      ground_id: "g-002",
      ground_name: "Johar Town Indoor Arena",
      ground_area: "Johar Town",
      slot_date: today,
      start_hour: joharStart,
      end_hour: joharEnd,
      status: joharStatus,
      total_price: joharTotal,
      advance_amount: joharAdvance,
      qr_code: "PITCH-BTODAY2-QR",
      arrived_at: joharArrivedAt,
      completion_payment_method: joharCompletion,
      remainder_collected: joharRemainder,
      review_submitted: false,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: nowIso,
    },
    {
      id: "b-today-003",
      slot_id: "s-today-3",
      player_id: "demo-user-id",
      player_name: "Junaid Afzal",
      player_phone: "+92 302 7778899",
      ground_id: "g-006",
      ground_name: "Wapda Town Athletic Ground",
      ground_area: "Wapda Town",
      slot_date: today,
      start_hour: 16,
      end_hour: 18,
      status: "confirmed",
      total_price: 4400,
      advance_amount: 1100,
      qr_code: "PITCH-BTODAY3-QR",
      arrived_at: null,
      completion_payment_method: null,
      remainder_collected: 0,
      review_submitted: false,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: nowIso,
    },
  ];
}

function mergeBooking(b: Booking): Booking {
  const patch = useManagerDemoStore.getState().bookingByIdPatch[b.id] ?? {};
  return {
    ...b,
    ...patch,
    player_phone: patch.player_phone ?? b.player_phone ?? DEFAULT_PLAYER_PHONE,
    player_name: patch.player_name ?? b.player_name ?? demoPlayerNameForBooking(b),
  };
}

/** Shown when QR scan or manual check-in cannot complete arrival. */
export const MANAGER_ARRIVAL_ERROR_MESSAGES = {
  INVALID_QR_TOKEN: "Invalid QR code — could not read booking.",
  QR_WRONG_GROUND: "This QR is for a different ground.",
  QR_OUTSIDE_TIME_WINDOW: "Too early or too late to scan this booking.",
  ARRIVAL_ALREADY_CONFIRMED: "This team has already been checked in.",
} as const;

/** Confirms arrival for a booking (QR or manual). Only `confirmed` / `on_hold` on this ground. */
export function tryConfirmArrival(
  booking: Booking | undefined,
  groundId: string,
):
  | { ok: true; booking: Booking }
  | { ok: false; code: keyof typeof MANAGER_ARRIVAL_ERROR_MESSAGES } {
  if (!booking) return { ok: false, code: "INVALID_QR_TOKEN" };
  if (booking.ground_id !== groundId) {
    return { ok: false, code: "QR_WRONG_GROUND" };
  }
  if (booking.status === "arrived") {
    return { ok: false, code: "ARRIVAL_ALREADY_CONFIRMED" };
  }
  if (booking.status !== "confirmed" && booking.status !== "on_hold") {
    return { ok: false, code: "INVALID_QR_TOKEN" };
  }
  useManagerDemoStore.getState().patchBooking(booking.id, {
    status: "arrived",
    arrived_at: new Date().toISOString(),
  });
  return { ok: true, booking };
}

export function getAllManagerBookings(): Booking[] {
  return [...SEED_BOOKINGS, ...buildRuntimeTodayBookings()].map(mergeBooking);
}

export function listManagerGrounds(): ManagerGround[] {
  const today = format(new Date(), "yyyy-MM-dd");
  const bookings = getAllManagerBookings();
  return SEED_GROUNDS.map((g) => ({
    id: g.id,
    name: g.name,
    area: g.area,
    city: g.city,
    today_booking_count: bookings.filter(
      (b) => b.ground_id === g.id && b.slot_date === today,
    ).length,
  }));
}

function statusMatchesFilter(
  status: Booking["status"],
  filter?: string,
): boolean {
  if (!filter) return true;
  const allowed = filter.includes(",")
    ? (filter.split(",") as Booking["status"][])
    : [filter as Booking["status"]];
  return allowed.includes(status);
}

export function getManagerBookingsPage(
  groundId: string,
  params: {
    date?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): PaginatedResponse<Booking> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  let items = getAllManagerBookings().filter((b) => b.ground_id === groundId);
  if (params.date) {
    items = items.filter((b) => b.slot_date === params.date);
  }
  if (params.status) {
    items = items.filter((b) => statusMatchesFilter(b.status, params.status));
  }
  items.sort((a, b) => {
    const da = new Date(a.slot_date + "T12:00:00").getTime();
    const db = new Date(b.slot_date + "T12:00:00").getTime();
    if (da !== db) return da - db;
    if (a.start_hour !== b.start_hour) return a.start_hour - b.start_hour;
    return a.end_hour - b.end_hour;
  });
  const total = items.length;
  const page = items.slice(offset, offset + limit);
  return { items: page, total, limit, offset };
}

export function getManagerBookingDetail(
  groundId: string,
  bookingId: string,
): Booking | undefined {
  return getAllManagerBookings().find(
    (x) => x.id === bookingId && x.ground_id === groundId,
  );
}

export function resolveBookingFromScanPayload(data: string): Booking | undefined {
  const trimmed = data.trim();
  const list = getAllManagerBookings();
  let b = list.find((x) => x.id === trimmed);
  if (!b) b = list.find((x) => x.qr_code === trimmed);
  if (!b) {
    try {
      const parts = data.split(".");
      if (parts.length === 3 && parts[1]) {
        const payload = JSON.parse(atob(parts[1])) as {
          booking_id?: string;
          sub?: string;
        };
        const bid = payload.booking_id ?? payload.sub;
        if (typeof bid === "string") b = list.find((x) => x.id === bid);
      }
    } catch {
      /* ignore */
    }
  }
  return b;
}

export function resolveBookingFromManualReference(ref: string): Booking | undefined {
  const q = ref.trim();
  if (!q) return undefined;
  const list = getAllManagerBookings();
  let b = list.find((x) => x.id === q);
  if (!b) b = list.find((x) => x.qr_code === q);
  if (!b) {
    const lower = q.toLowerCase();
    b = list.find(
      (x) =>
        x.id.toLowerCase().startsWith(lower) ||
        (x.qr_code?.toLowerCase().includes(lower) ?? false),
    );
  }
  return b;
}

export function listManagerSlotsForGround(
  groundId: string,
  date: string,
): Slot[] {
  return getSlotsForGroundDate(groundId, date);
}

function mergeReview(r: Review): Review {
  const patch = useManagerDemoStore.getState().reviewByIdPatch[r.id] ?? {};
  return { ...r, ...patch };
}

export function getManagerReviewsPage(
  groundId: string,
  params: { sort?: "newest" | "oldest"; limit?: number; offset?: number } = {},
): PaginatedResponse<Review> {
  const limit = params.limit ?? 15;
  const offset = params.offset ?? 0;
  const raw = (SEED_REVIEWS[groundId] ?? []).map(mergeReview);
  const sorted = [...raw].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return params.sort === "oldest" ? ta - tb : tb - ta;
  });
  const total = sorted.length;
  return {
    items: sorted.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}
