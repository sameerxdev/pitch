import { apiClient } from "./client";
import type {
  Ground,
  Slot,
  Review,
  GroundSearchParams,
  PaginatedResponse,
} from "./types";

export async function getGrounds(
  params: GroundSearchParams = {},
): Promise<PaginatedResponse<Ground>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Ground> }>(
    "/grounds",
    {
      params,
    },
  );
  return data.data;
}

export async function getGround(
  id: string,
): Promise<Ground & { latest_reviews: Review[] }> {
  const { data } = await apiClient.get<{
    data: Ground & { latest_reviews: Review[] };
  }>(`/grounds/${id}`);
  return data.data;
}

export async function getGroundSlots(
  groundId: string,
  params: { date?: string; from?: string; to?: string },
): Promise<Slot[]> {
  const { data } = await apiClient.get<{ data: Slot[] }>(
    `/grounds/${groundId}/slots`,
    { params },
  );
  return data.data;
}

export async function getGroundReviews(
  groundId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<Review>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Review> }>(
    `/grounds/${groundId}/reviews`,
    { params },
  );
  return data.data;
}
