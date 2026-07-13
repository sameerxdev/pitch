/**
 * Ground owner dashboard demo — no HTTP.
 * TODO: Remove when owner API is wired.
 */
import { format, subDays } from "date-fns";
import type {
  AssignManagerRequest,
  CreateGroundRequest,
  Ground,
  ManagerAssignment,
  OwnerAnalytics,
  PaginatedResponse,
  Review,
} from "@/api/types";
import { SEED_BOOKINGS, SEED_GROUNDS, SEED_REVIEWS } from "@/data/seedData";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";
import { useManagerDemoStore } from "@/stores/managerDemoStore";

export const DEMO_OWNER_ID = "owner-001";

const SEED_MANAGER_ASSIGNMENTS: ManagerAssignment[] = [
  {
    id: "ma-001",
    ground_id: "g-001",
    ground_name: "DHA Sports Complex – Ground A",
    ground_area: "DHA Phase 5",
    ground_city: "Lahore",
    manager_id: "mgr-001",
    manager_name: "Hassan Raza",
    manager_phone: "+92 300 5551234",
    is_active: true,
    assigned_at: "2026-01-10T10:00:00Z",
  },
  {
    id: "ma-002",
    ground_id: "g-002",
    ground_name: "Johar Town Indoor Arena",
    ground_area: "Johar Town",
    ground_city: "Lahore",
    manager_id: "mgr-002",
    manager_name: "Ali Malik",
    manager_phone: "+92 321 7778899",
    is_active: true,
    assigned_at: "2026-02-15T09:00:00Z",
  },
];

function mergeGround(g: Ground): Ground {
  const patch = useOwnerDemoStore.getState().groundPatches[g.id] ?? {};
  return { ...g, ...patch };
}

function ownerGroundsRaw(): Ground[] {
  const { addedGrounds } = useOwnerDemoStore.getState();
  return [
    ...SEED_GROUNDS.filter((g) => g.owner_id === DEMO_OWNER_ID),
    ...addedGrounds,
  ];
}

export function getOwnerGrounds(): Promise<Ground[]> {
  return Promise.resolve(ownerGroundsRaw().map(mergeGround));
}

export function getOwnerGroundById(id: string): Promise<Ground | undefined> {
  return Promise.resolve(
    ownerGroundsRaw().map(mergeGround).find((g) => g.id === id),
  );
}

export async function createGroundWithPhotos(
  payload: CreateGroundRequest,
  photoUris: string[],
  managerPhone?: string,
): Promise<Ground> {
  const id = `g-demo-${Date.now()}`;
  const ground: Ground = {
    id,
    owner_id: DEMO_OWNER_ID,
    name: payload.name,
    city: payload.city,
    area: payload.area,
    address: payload.address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    hourly_rate_day: payload.hourly_rate_day,
    hourly_rate_night: payload.hourly_rate_night,
    advance_percent: payload.advance_percent,
    avg_rating: 0,
    review_count: 0,
    status: "pending_verification",
    photos: photoUris,
    facilities: payload.facilities ?? [],
    created_at: new Date().toISOString(),
  };
  const store = useOwnerDemoStore.getState();
  store.addGround(ground);
  store.bump();
  if (managerPhone?.trim()) {
    const phone = managerPhone.replace(/\s/g, "");
    await assignManager(id, {
      phone: phone.startsWith("+") ? phone : `+92${phone}`,
    });
  }
  return ground;
}

export async function updateGround(
  id: string,
  updates: Partial<CreateGroundRequest> & { is_active?: boolean },
): Promise<Ground> {
  const existing = ownerGroundsRaw().find((g) => g.id === id);
  if (!existing) throw new Error("Ground not found");
  const patch: Partial<Ground> = { ...updates };
  if (updates.is_active !== undefined) {
    patch.status = updates.is_active ? "active" : "inactive";
  }
  useOwnerDemoStore.getState().patchGround(id, patch);
  return mergeGround({ ...existing, ...patch });
}

function managersForGround(groundId: string): ManagerAssignment[] {
  const store = useOwnerDemoStore.getState();
  if (store.managersByGroundId[groundId]) {
    return store.managersByGroundId[groundId];
  }
  return SEED_MANAGER_ASSIGNMENTS.filter((m) => m.ground_id === groundId);
}

export function getGroundManagers(groundId: string): Promise<ManagerAssignment[]> {
  return Promise.resolve(managersForGround(groundId));
}

export async function assignManager(
  groundId: string,
  payload: AssignManagerRequest,
): Promise<ManagerAssignment> {
  const ground = ownerGroundsRaw().find((g) => g.id === groundId);
  const phone = payload.phone.startsWith("+") ? payload.phone : `+92${payload.phone}`;
  const assignment: ManagerAssignment = {
    id: `ma-demo-${Date.now()}`,
    ground_id: groundId,
    ground_name: ground?.name ?? "Ground",
    ground_area: ground?.area ?? "",
    ground_city: ground?.city ?? "Lahore",
    manager_id: `mgr-demo-${Date.now()}`,
    manager_name: "New Manager",
    manager_phone: phone,
    is_active: true,
    assigned_at: new Date().toISOString(),
  };
  const next = [...managersForGround(groundId), assignment];
  const store = useOwnerDemoStore.getState();
  store.setManagersForGround(groundId, next);
  store.bump();
  return assignment;
}

export async function removeManager(
  groundId: string,
  managerId: string,
): Promise<void> {
  const next = managersForGround(groundId).filter((m) => m.manager_id !== managerId);
  const store = useOwnerDemoStore.getState();
  store.setManagersForGround(groundId, next);
  store.bump();
}

function periodMultiplier(period: "today" | "week" | "month"): number {
  if (period === "week") return 5;
  if (period === "month") return 22;
  return 1;
}

function buildMetrics(
  bookings: typeof SEED_BOOKINGS,
  mult: number,
): OwnerAnalytics["period"] {
  const completed = bookings.filter((b) => b.status === "completed");
  const collected = completed.reduce((s, b) => s + b.remainder_collected + b.advance_amount, 0);
  const estimated = bookings.reduce((s, b) => s + b.total_price, 0);
  const count = Math.round(bookings.length * mult) || bookings.length;
  return {
    bookings_count: count,
    bookings_trend_percent: 12.5,
    estimated_revenue: Math.round(estimated * mult),
    estimated_revenue_trend_percent: 8.2,
    collected_revenue: Math.round(collected * mult),
    collected_revenue_trend_percent: 15.0,
  };
}

export function getOwnerAnalytics(params: {
  period: "today" | "week" | "month";
  ground_id?: string;
}): Promise<OwnerAnalytics> {
  const groundIds = new Set(ownerGroundsRaw().map((g) => g.id));
  let bookings = SEED_BOOKINGS.filter((b) => groundIds.has(b.ground_id));
  if (params.ground_id) {
    bookings = bookings.filter((b) => b.ground_id === params.ground_id);
  }

  const mult = periodMultiplier(params.period);
  const period = buildMetrics(bookings, mult);

  const per_ground = ownerGroundsRaw().map((g) => {
    const gb = bookings.filter((b) => b.ground_id === g.id);
    return {
      ground_id: g.id,
      ground_name: g.name,
      metrics: buildMetrics(gb, mult),
    };
  });

  const daily_volume = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const count = bookings.filter((b) => b.slot_date === date).length;
    return { date, count: Math.max(count, i % 3) };
  });

  return Promise.resolve({ period, daily_volume, per_ground });
}

function mergeReview(r: Review): Review {
  const patch = useManagerDemoStore.getState().reviewByIdPatch[r.id] ?? {};
  return { ...r, ...patch };
}

export function getOwnerReviewsPage(
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
