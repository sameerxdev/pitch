import * as Notifications from "expo-notifications";
import { apiClient } from "@/api/client";

// expo-notifications remote push is not supported in Expo Go (SDK 53+).
// Guard every call so the app still boots in Expo Go without crashing.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Newer expo-notifications splits the old shouldShowAlert into:
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // Silently ignored in Expo Go
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await apiClient.patch("/users/me", { fcm_token: token });
    return token;
  } catch {
    return null;
  }
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription | null {
  try {
    return Notifications.addNotificationReceivedListener(handler);
  } catch {
    return null;
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription | null {
  try {
    return Notifications.addNotificationResponseReceivedListener(handler);
  } catch {
    return null;
  }
}

export function removeSubscription(subscription: Notifications.Subscription | null): void {
  subscription?.remove();
}
