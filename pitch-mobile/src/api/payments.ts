import { apiClient } from "./client";
import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  Payment,
} from "./types";

export async function initiatePayment(
  payload: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> {
  const { data } = await apiClient.post<{ data: InitiatePaymentResponse }>(
    "/payments/initiate",
    payload,
  );
  return data.data;
}

export async function getPayment(paymentId: string): Promise<Payment> {
  const { data } = await apiClient.get<{ data: Payment }>(
    `/payments/${paymentId}`,
  );
  return data.data;
}
