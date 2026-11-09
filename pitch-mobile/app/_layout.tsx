import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useManagerStore } from "@/stores/managerStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";
import { BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed/700Bold";
import "../global.css";
import { colors } from "@/constants/colors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

function AuthGate() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BarlowCondensed_700Bold,
  });
  // If a font fails to load, carry on with the system font.
  const ready = fontsLoaded || !!fontError;

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

  if (isLoading || !ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
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
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        <SafeAreaProvider>
          {user && <NotificationHandler />}
          <AuthGate />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
