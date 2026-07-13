import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useManagerStore } from "@/stores/managerStore";
import { useNotifications } from "@/hooks/useNotifications";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

function AuthGate() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)" as never);
      return;
    }

    if (!user.full_name) {
      router.replace("/(auth)/profile-setup");
      return;
    }

    if (inAuthGroup) {
      switch (user.role) {
        case "player":
          router.replace("/(player)" as never);
          break;
        case "manager":
          useManagerStore.getState().clearActiveGround();
          router.replace("/(manager)/ground-select" as never);
          break;
        case "ground_owner":
          router.replace("/(owner)/(tabs)" as never);
          break;
        case "admin":
          router.replace("/(admin)" as never);
          break;
      }
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#1A5C38",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return <Slot />;
}

function NotificationHandler() {
  useNotifications();
  return null;
}

export default function RootLayout() {
  const { loadFromStorage, user } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {user && <NotificationHandler />}
          <AuthGate />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
