import * as SecureStore from "expo-secure-store";
import { apiClient } from "./client";
import type {
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from "./types";

export async function requestOtp(
  payload: RequestOtpRequest,
): Promise<RequestOtpResponse> {
  const { data } = await apiClient.post<{ data: RequestOtpResponse }>(
    "/auth/request-otp",
    payload,
  );
  return data.data;
}

export async function verifyOtp(
  payload: VerifyOtpRequest,
): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<{ data: VerifyOtpResponse }>(
    "/auth/verify-otp",
    payload,
  );
  return data.data;
}

export async function refreshToken(
  payload: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const { data } = await apiClient.post<{ data: RefreshTokenResponse }>(
    "/auth/refresh",
    payload,
  );
  return data.data;
}

export async function logout(): Promise<void> {
  const refreshToken = await SecureStore.getItemAsync("refresh_token");
  await apiClient.post("/auth/logout", undefined, {
    headers: refreshToken ? { "X-Refresh-Token": refreshToken } : {},
  });
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ data: User }>("/users/me");
  return data.data;
}

export async function updateMe(
  updates: Partial<Pick<User, "full_name" | "city" | "fcm_token">>,
): Promise<User> {
  const { data } = await apiClient.patch<{ data: User }>("/users/me", updates);
  return data.data;
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete("/users/me");
}
