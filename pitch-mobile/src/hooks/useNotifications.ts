import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
  removeSubscription,
} from "@/utils/notifications";
import { routeForNotification } from "@/utils/notificationRoutes";
import { useAuthStore } from "@/stores/authStore";

export function useNotifications() {
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);
  const notifListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().catch(() => null);

    notifListenerRef.current = addNotificationListener(() => {
      // Foreground notification received — handled by setNotificationHandler
    });

    responseListenerRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const route = routeForNotification(data, useAuthStore.getState().user?.role);
      if (route) {
        router.push(route as never);
      }
    });

    return () => {
      if (notifListenerRef.current) removeSubscription(notifListenerRef.current);
      if (responseListenerRef.current) removeSubscription(responseListenerRef.current);
    };
  }, [router]);
}
