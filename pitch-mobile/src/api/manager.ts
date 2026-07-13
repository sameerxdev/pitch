import { apiClient } from "./client";
import type {
  ManagerGround,
  Slot,
  Booking,
  Review,
  PaginatedResponse,
  ApplySlotsRequest,
  ApplySlotsResponse,
} from "./types";

export async function getManagerGrounds(): Promise<ManagerGround[]> {
  const { data } = await apiClient.get<{ data: ManagerGround[] }>(
    "/manager/grounds",
  );
  return data.data;
}

export async function getManagerSlots(
  groundId: string,
  params: { date?: string; from?: string; to?: string },
): Promise<Slot[]> {
  const { data } = await apiClient.get<{ data: Slot[] }>(
    `/manager/grounds/${groundId}/slots`,
    { params },
  );
  return data.data;
}

export async function updateSlot(
  groundId: string,
  slotId: string,
  updates: { status?: "blocked" | "available"; price?: number },
): Promise<Slot> {
  const { data } = await apiClient.patch<{ data: Slot }>(
    `/manager/grounds/${groundId}/slots/${slotId}`,
    updates,
  );
  return data.data;
}

export async function getManagerBookings(
  groundId: string,
  params: {
    date?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<Booking>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Booking> }>(
    `/manager/grounds/${groundId}/bookings`,
    { params },
  );
  return data.data;
}

export async function getManagerBookingDetail(
  groundId: string,
  bookingId: string,
): Promise<Booking> {
  const { data } = await apiClient.get<{ data: Booking }>(
    `/manager/grounds/${groundId}/bookings/${bookingId}`,
  );
  return data.data;
}

export async function getManagerReviews(
  groundId: string,
  params: { sort?: "newest" | "oldest"; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<Review>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Review> }>(
    `/manager/grounds/${groundId}/reviews`,
    { params },
  );
  return data.data;
}

export async function applyManagerSlots(
  groundId: string,
  payload: ApplySlotsRequest,
): Promise<ApplySlotsResponse> {
  const { data } = await apiClient.post<{ data: ApplySlotsResponse }>(
    `/manager/grounds/${groundId}/slots/apply`,
    payload,
  );
  return data.data;
}
