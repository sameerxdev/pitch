import * as SecureStore from "expo-secure-store";
import type { CachedQR } from "@/api/types";

const QR_CACHE_PREFIX = "qr_cache_";

export async function cacheQR(bookingId: string, data: CachedQR): Promise<void> {
  await SecureStore.setItemAsync(
    `${QR_CACHE_PREFIX}${bookingId}`,
    JSON.stringify(data)
  );
}

export async function getCachedQR(bookingId: string): Promise<CachedQR | null> {
  try {
    const json = await SecureStore.getItemAsync(`${QR_CACHE_PREFIX}${bookingId}`);
    return json ? (JSON.parse(json) as CachedQR) : null;
  } catch {
    return null;
  }
}

export async function deleteCachedQR(bookingId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${QR_CACHE_PREFIX}${bookingId}`);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
