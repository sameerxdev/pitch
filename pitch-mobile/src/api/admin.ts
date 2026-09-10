import { apiClient } from "./client";
import type {
  AdminGround,
  AdminReview,
  AdminUser,
  GroundStatus,
  PaginatedResponse,
  PlatformAnalytics,
  UserRole,
} from "./types";

export async function getPlatformAnalytics(
  period: "today" | "week" | "month",
): Promise<PlatformAnalytics> {
  const { data } = await apiClient.get<{ data: PlatformAnalytics }>(
    "/admin/analytics",
    { params: { period } },
  );
  return data.data;
}

// ─── Grounds ─────────────────────────────────────────────────────────────────

export async function getAdminGrounds(
  params: {
    /** Comma-separated list of GroundStatus values. */
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<AdminGround>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<AdminGround> }>(
    "/admin/grounds",
    { params },
  );
  return data.data;
}

/** Approve a pending ground, or reject it with a reason. */
export async function verifyGround(
  groundId: string,
  payload: { approve: boolean; reason?: string },
): Promise<AdminGround> {
  const { data } = await apiClient.patch<{ data: AdminGround }>(
    `/admin/grounds/${groundId}/verify`,
    payload,
  );
  return data.data;
}

export async function setGroundStatus(
  groundId: string,
  payload: { status: GroundStatus; reason?: string },
): Promise<AdminGround> {
  const { data } = await apiClient.patch<{ data: AdminGround }>(
    `/admin/grounds/${groundId}`,
    payload,
  );
  return data.data;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getAdminUsers(
  params: { role?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<AdminUser> }>(
    "/admin/users",
    { params },
  );
  return data.data;
}

export async function updateAdminUser(
  userId: string,
  payload: { role?: UserRole; is_suspended?: boolean },
): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ data: AdminUser }>(
    `/admin/users/${userId}`,
    payload,
  );
  return data.data;
}

// ─── Review moderation ───────────────────────────────────────────────────────

export async function getAdminReviews(
  params: {
    ground_id?: string;
    visible?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<AdminReview>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<AdminReview> }>(
    "/admin/reviews",
    { params },
  );
  return data.data;
}

export async function moderateReview(
  reviewId: string,
  payload: { is_visible: boolean },
): Promise<AdminReview> {
  const { data } = await apiClient.patch<{ data: AdminReview }>(
    `/admin/reviews/${reviewId}`,
    payload,
  );
  return data.data;
}
