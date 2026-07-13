import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { Config } from "@/constants/config";

if (__DEV__) {
  console.log("[api] base URL:", Config.API_BASE_URL);
}

export const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.request.use(async (config) => {
  const path = config.url ?? "";
  const isAuthRoute =
    path.startsWith("/auth/") || path.includes("/auth/");

  if (!isAuthRoute) {
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const { data: envelope } = await axios.post<{
          data: { access_token: string; refresh_token: string };
        }>(`${Config.API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = envelope.data;
        await SecureStore.setItemAsync("access_token", access_token);
        await SecureStore.setItemAsync("refresh_token", refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch {
        const { useAuthStore } = await import("@/stores/authStore");
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { code?: string } })?.error?.code ??
      null
    );
  }
  return null;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return "Cannot reach the server. Check Wi‑Fi and that EXPO_PUBLIC_API_BASE_URL matches your PC IP (see Metro QR URL).";
    }
    if (error.message === "Network Error" || !error.response) {
      return "Network error. Use the same Wi‑Fi as your dev machine and update the API URL in .env.";
    }
    return (
      (error.response?.data as { error?: { message?: string } })?.error
        ?.message ?? error.message
    );
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
