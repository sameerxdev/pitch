import { apiClient } from "./client";
import type {
  Booking,
  CreateBookingRequest,
  CreateBookingResponse,
  ArriveRequest,
  CompleteBookingRequest,
  PaginatedResponse,
} from "./types";

export async function createBooking(
  payload: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  const { data } = await apiClient.post<{ data: CreateBookingResponse }>(
    "/bookings",
    payload,
  );
  return data.data;
}

export async function getBookings(
  params: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<Booking>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<Booking> }>(
    "/bookings",
    { params },
  );
  return data.data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await apiClient.get<{ data: Booking }>(`/bookings/${id}`);
  return data.data;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await apiClient.delete<{ data: Booking }>(`/bookings/${id}`);
  return data.data;
}

export async function arriveBooking(
  id: string,
  payload: ArriveRequest,
): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>(
    `/bookings/${id}/arrive`,
    payload,
  );
  return data.data;
}

export async function completeBooking(
  id: string,
  payload: CompleteBookingRequest,
): Promise<Booking> {
  const { data } = await apiClient.post<{ data: Booking }>(
    `/bookings/${id}/complete`,
    payload,
  );
  return data.data;
}
