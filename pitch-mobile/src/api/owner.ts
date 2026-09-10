import { apiClient } from "./client";
import type {
  ApplySlotsRequest,
  ApplySlotsResponse,
  AssignManagerRequest,
  CreateGroundRequest,
  Ground,
  GroundDetail,
  ManagerAssignment,
  OwnerAnalytics,
  PaginatedResponse,
  Review,
  Slot,
} from "./types";

export async function getOwnerGrounds(): Promise<Ground[]> {
  const { data } = await apiClient.get<{ data: Ground[] }>("/owner/grounds");
  return data.data;
}

/**
 * Owner-scoped detail. Unlike `GET /grounds/{id}` this also returns grounds
 * that are pending verification, inactive, or suspended.
 */
export async function getOwnerGround(id: string): Promise<GroundDetail> {
  const { data } = await apiClient.get<{ data: GroundDetail }>(
    `/owner/grounds/${id}`,
  );
  return data.data;
}

/** Ground creation is multipart because photos upload alongside the fields. */
export async function createGroundWithPhotos(
  payload: CreateGroundRequest,
  photoUris: string[],
): Promise<Ground> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(
      key,
      Array.isArray(value) || typeof value === "object"
        ? JSON.stringify(value)
        : String(value),
    );
  });
  photoUris.forEach((uri, idx) => {
    const filename = uri.split("/").pop() ?? `photo_${idx}.jpg`;
    const ext = (filename.split(".").pop() ?? "jpg").toLowerCase();
    formData.append("photos", {
      uri,
      name: filename,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
    } as unknown as Blob);
  });
  const { data } = await apiClient.post<{ data: Ground }>(
    "/owner/grounds",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function updateGround(
  id: string,
  updates: Partial<CreateGroundRequest> & { is_active?: boolean },
): Promise<Ground> {
  const { data } = await apiClient.patch<{ data: Ground }>(
    `/owner/grounds/${id}`,
    updates,
  );
  return data.data;
}

// ─── Slots ───────────────────────────────────────────────────────────────────

export async function getOwnerSlots(
  groundId: string,
  params: { date?: string; from?: string; to?: string },
): Promise<Slot[]> {
  const { data } = await apiClient.get<{ data: Slot[] }>(
    `/owner/grounds/${groundId}/slots`,
    { params },
  );
  return data.data;
}

export async function updateOwnerSlot(
  groundId: string,
  slotId: string,
  updates: { status?: "blocked" | "available"; price?: number },
): Promise<Slot> {
  const { data } = await apiClient.patch<{ data: Slot }>(
    `/owner/grounds/${groundId}/slots/${slotId}`,
    updates,
  );
  return data.data;
}

export async function applyOwnerSlots(
  groundId: string,
  payload: ApplySlotsRequest,
): Promise<ApplySlotsResponse> {
  const { data } = await apiClient.post<{ data: ApplySlotsResponse }>(
    `/owner/grounds/${groundId}/slots/apply`,
    payload,
  );
  return data.data;
}

// ─── Managers ────────────────────────────────────────────────────────────────

export async function getGroundManagers(
  groundId: string,
): Promise<ManagerAssignment[]> {
  const { data } = await apiClient.get<{ data: ManagerAssignment[] }>(
    `/owner/grounds/${groundId}/managers`,
  );
  return data.data;
}

export async function assignManager(
  groundId: string,
  payload: AssignManagerRequest,
): Promise<ManagerAssignment> {
  const { data } = await apiClient.post<{ data: ManagerAssignment }>(
    `/owner/grounds/${groundId}/managers`,
    payload,
  );
  return data.data;
}

/**
 * `id` may be the manager's user id or — for an invite whose phone hasn't
 * signed up yet — the assignment's own id. The backend accepts both.
 */
export async function removeManager(
  groundId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/owner/grounds/${groundId}/managers/${id}`);
}

// ─── Analytics & reviews ─────────────────────────────────────────────────────

export async function getOwnerAnalytics(params: {
  period: "today" | "week" | "month";
  ground_id?: string;
}): Promise<OwnerAnalytics> {
  const { data } = await apiClient.get<{ data: OwnerAnalytics }>(
    "/owner/analytics",
    { params },
  );
  return data.data;
}

export async function getOwnerReviews(
  groundId: string,
  params: { sort?: "newest" | "oldest"; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<Review>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Review> }>(
    `/owner/grounds/${groundId}/reviews`,
    { params },
  );
  return data.data;
}
