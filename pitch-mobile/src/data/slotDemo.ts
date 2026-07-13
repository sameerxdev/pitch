/**
 * Demo slot generation & lookup — shared by player, manager, and owner.
 * TODO: Replace with API when backend supports slot schedules.
 */
import {
  addDays,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type {
  Ground,
  GroundSlotSchedule,
  RateType,
  Slot,
} from "@/api/types";

export type ManualSlotTemplate = {
  start_hour: number;
  end_hour: number;
  rate_type: RateType;
  /** Fixed slot price; if omitted, day/night hourly × duration is used. */
  price?: number;
};
import { Config } from "@/constants/config";
import { SEED_BOOKINGS, SEED_GROUNDS } from "@/data/seedData";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";
import {
  slotsCacheKey,
  useSlotDemoStore,
} from "@/stores/slotDemoStore";

const BOOKED_STATUSES = new Set([
  "confirmed",
  "arrived",
  "pending_payment",
  "pending_advance",
]);

export function resolveGround(groundId: string): Ground | undefined {
  const { addedGrounds, groundPatches } = useOwnerDemoStore.getState();
  const raw = [...SEED_GROUNDS, ...addedGrounds].find((g) => g.id === groundId);
  if (!raw) return undefined;
  const patch = groundPatches[groundId] ?? {};
  return { ...raw, ...patch };
}

export function defaultScheduleForGround(ground: Ground): GroundSlotSchedule {
  return {
    slot_duration_hours: 2,
    operating_start_hour: 8,
    operating_end_hour: 24,
    night_start_hour: 18,
    hourly_rate_day: ground.hourly_rate_day,
    hourly_rate_night: ground.hourly_rate_night,
  };
}

export function getScheduleForGround(groundId: string): GroundSlotSchedule | null {
  const store = useSlotDemoStore.getState();
  if (store.scheduleByGroundId[groundId]) {
    return store.scheduleByGroundId[groundId];
  }
  const ground = resolveGround(groundId);
  return ground ? defaultScheduleForGround(ground) : null;
}

function isSlotBooked(groundId: string, date: string, startHour: number): boolean {
  return SEED_BOOKINGS.some(
    (b) =>
      b.ground_id === groundId &&
      b.slot_date === date &&
      b.start_hour === startHour &&
      BOOKED_STATUSES.has(b.status),
  );
}

export function generateSlotsForDate(
  groundId: string,
  date: string,
  schedule: GroundSlotSchedule,
): Slot[] {
  const {
    slot_duration_hours,
    operating_start_hour,
    operating_end_hour,
    night_start_hour,
    hourly_rate_day,
    hourly_rate_night,
  } = schedule;

  const slots: Slot[] = [];
  for (
    let start = operating_start_hour;
    start + slot_duration_hours <= operating_end_hour;
    start += slot_duration_hours
  ) {
    const end = start + slot_duration_hours;
    const rate_type = start >= night_start_hour ? "night" : "day";
    const hourly =
      rate_type === "night" ? hourly_rate_night : hourly_rate_day;
    const booked = isSlotBooked(groundId, date, start);
    slots.push({
      id: `sl-${groundId}-${date}-${start}`,
      ground_id: groundId,
      date,
      start_hour: start,
      end_hour: end,
      status: booked ? "booked" : "available",
      rate_type,
      price: hourly * slot_duration_hours,
      hold_expires_at: null,
    });
  }
  return slots;
}

export function validateManualSlotTemplate(
  template: ManualSlotTemplate,
): string | null {
  if (template.start_hour < 0 || template.start_hour > 23) {
    return "Start hour must be between 0 and 23.";
  }
  if (template.end_hour < 1 || template.end_hour > 24) {
    return "End hour must be between 1 and 24.";
  }
  if (template.end_hour <= template.start_hour) {
    return "End time must be after start time.";
  }
  return null;
}

export function slotPriceFromTemplate(
  template: ManualSlotTemplate,
  hourlyDay: number,
  hourlyNight: number,
): number {
  if (template.price != null && template.price > 0) return template.price;
  const hours = template.end_hour - template.start_hour;
  const hourly =
    template.rate_type === "night" ? hourlyNight : hourlyDay;
  return hourly * hours;
}

export function buildSlotFromTemplate(
  groundId: string,
  date: string,
  template: ManualSlotTemplate,
  hourlyDay: number,
  hourlyNight: number,
): Slot {
  const booked = isSlotBooked(groundId, date, template.start_hour);
  return {
    id: `sl-${groundId}-${date}-${template.start_hour}`,
    ground_id: groundId,
    date,
    start_hour: template.start_hour,
    end_hour: template.end_hour,
    status: booked ? "booked" : "available",
    rate_type: template.rate_type,
    price: slotPriceFromTemplate(template, hourlyDay, hourlyNight),
    hold_expires_at: null,
  };
}

/** Apply manually defined slots to each day in [from, to] (inclusive). Merges by start_hour. */
export function applyManualSlotsToDateRange(
  groundId: string,
  fromDate: string,
  toDate: string,
  templates: ManualSlotTemplate[],
  hourlyDay: number,
  hourlyNight: number,
): number {
  if (templates.length === 0) {
    throw new Error("Add at least one slot before applying.");
  }
  for (const t of templates) {
    const err = validateManualSlotTemplate(t);
    if (err) throw new Error(err);
  }

  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  if (isAfter(from, to)) {
    throw new Error("End date must be on or after start date.");
  }

  const store = useSlotDemoStore.getState();
  const days = eachDayOfInterval({ start: from, end: to });
  let slotCount = 0;

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const existing = getStoredSlots(groundId, dateStr) ?? [];
    const byStart = new Map(existing.map((s) => [s.start_hour, s]));

    for (const template of templates) {
      byStart.set(
        template.start_hour,
        buildSlotFromTemplate(
          groundId,
          dateStr,
          template,
          hourlyDay,
          hourlyNight,
        ),
      );
    }

    const merged = [...byStart.values()].sort(
      (a, b) => a.start_hour - b.start_hour,
    );
    store.setSlotsForDate(groundId, dateStr, merged);
    slotCount += templates.length;
  }

  store.bump();
  return slotCount;
}

export function applyScheduleToDateRange(
  groundId: string,
  fromDate: string,
  toDate: string,
  schedule: GroundSlotSchedule,
): number {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  if (isAfter(from, to)) {
    throw new Error("End date must be on or after start date.");
  }

  const store = useSlotDemoStore.getState();
  store.setSchedule(groundId, schedule);

  const days = eachDayOfInterval({ start: from, end: to });
  let slotCount = 0;
  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const slots = generateSlotsForDate(groundId, dateStr, schedule);
    store.setSlotsForDate(groundId, dateStr, slots);
    slotCount += slots.length;
  }
  return slotCount;
}

export function isWithinPlayerBookingWindow(dateStr: string): boolean {
  const day = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  const maxDay = startOfDay(
    addDays(today, Config.PLAYER_MAX_BOOKING_DAYS_AHEAD),
  );
  return !isBefore(day, today) && !isAfter(day, maxDay);
}

export function getSlotsForGroundDate(
  groundId: string,
  date: string,
  options: { enforcePlayerWindow?: boolean } = {},
): Slot[] {
  if (options.enforcePlayerWindow && !isWithinPlayerBookingWindow(date)) {
    return [];
  }

  const stored = getStoredSlots(groundId, date);
  if (stored?.length) return stored;

  const schedule = getScheduleForGround(groundId);
  if (!schedule) return [];

  return generateSlotsForDate(groundId, date, schedule);
}

function getStoredSlots(groundId: string, date: string): Slot[] | undefined {
  return useSlotDemoStore.getState().slotsByKey[slotsCacheKey(groundId, date)];
}

/** Dates in the player booking window that have at least one non-booked slot. */
export function getPlayerBookableDates(groundId: string): string[] {
  const today = startOfDay(new Date());
  const dates: string[] = [];
  for (let i = 0; i <= Config.PLAYER_MAX_BOOKING_DAYS_AHEAD; i++) {
    const dateStr = format(addDays(today, i), "yyyy-MM-dd");
    const slots = getSlotsForGroundDate(groundId, dateStr, {
      enforcePlayerWindow: true,
    });
    if (slots.some((s) => s.status === "available" || s.status === "on_hold")) {
      dates.push(dateStr);
    }
  }
  return dates;
}

export function markSlotOnHold(
  groundId: string,
  date: string,
  slotId: string,
  holdExpiresAt: string,
): void {
  useSlotDemoStore
    .getState()
    .updateSlot(groundId, date, slotId, {
      status: "on_hold",
      hold_expires_at: holdExpiresAt,
    });
}

/** Seed demo slots for primary grounds (today → +13 days). */
export function seedDemoSlotsIfEmpty(): void {
  const store = useSlotDemoStore.getState();
  if (Object.keys(store.slotsByKey).length > 0) return;

  const today = startOfDay(new Date());
  const to = addDays(today, Config.PLAYER_MAX_BOOKING_DAYS_AHEAD);
  const fromStr = format(today, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const demoTemplates: ManualSlotTemplate[] = [
    { start_hour: 0, end_hour: 2, rate_type: "night" },
    { start_hour: 2, end_hour: 4, rate_type: "night" },
    { start_hour: 5, end_hour: 7, rate_type: "night" },
    { start_hour: 16, end_hour: 18, rate_type: "day" },
    { start_hour: 18, end_hour: 20, rate_type: "night" },
    { start_hour: 20, end_hour: 22, rate_type: "night" },
    { start_hour: 22, end_hour: 24, rate_type: "night" },
  ];

  for (const ground of SEED_GROUNDS.filter((g) => g.status === "active")) {
    try {
      applyManualSlotsToDateRange(
        ground.id,
        fromStr,
        toStr,
        demoTemplates,
        ground.hourly_rate_day,
        ground.hourly_rate_night,
      );
    } catch {
      /* ignore invalid interval */
    }
  }
}

seedDemoSlotsIfEmpty();
