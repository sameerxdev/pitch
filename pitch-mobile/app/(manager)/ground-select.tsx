import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useManagerGrounds } from "@/hooks/useManagerGrounds";
import { useManagerStore } from "@/stores/managerStore";
import { useLogout } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";
import type { ManagerGround } from "@/api/types";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

export default function GroundSelectScreen() {
  const router = useRouter();
  const { setActiveGround, setAssignedGrounds, clearActiveGround } =
    useManagerStore();
  const { data, isLoading, isError, error, refetch } = useManagerGrounds();
  const grounds = data ?? [];
  const logoutMutation = useLogout();
  const autoNavigatedRef = useRef(false);

  useEffect(() => {
    if (isLoading || data === undefined) return;

    const prev = useManagerStore.getState().assignedGrounds;
    const assignmentsChanged =
      prev.length !== data.length ||
      data.some((g, i) => g.id !== prev[i]?.id);
    if (assignmentsChanged) {
      setAssignedGrounds(data);
    }

    if (data.length === 1 && data[0]) {
      const active = useManagerStore.getState().activeGround;
      if (active?.id !== data[0].id) {
        setActiveGround(data[0]);
      }
      if (!autoNavigatedRef.current) {
        autoNavigatedRef.current = true;
        router.replace("/(manager)/(tabs)" as never);
      }
    } else {
      autoNavigatedRef.current = false;
    }
  }, [data, isLoading, router, setActiveGround, setAssignedGrounds]);

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          clearActiveGround();
          logoutMutation.mutate(undefined, {
            onError: (err) =>
              Alert.alert("Logout failed", getApiErrorMessage(err)),
          });
        },
      },
    ]);
  }

  function handleSelect(ground: ManagerGround) {
    setActiveGround(ground);
    router.replace("/(manager)/(tabs)" as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 24, flex: 1 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Select Ground
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 24 }}>
          {grounds.length > 1
            ? "You manage multiple grounds. Choose which one to work on."
            : "Choose the ground you want to manage today."}
        </Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.brand}
            style={{ marginTop: 48 }}
          />
        ) : isError ? (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: colors.danger, textAlign: "center" }}>
              {getApiErrorMessage(error)}
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16 }}>
              <Text style={{ color: colors.brand, fontWeight: "700" }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={grounds}
            keyExtractor={(g) => g.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
            ListFooterComponent={
              <View style={{ marginTop: 8 }}>
                <LogoutButton fullWidth onPress={handleLogout} loading={logoutMutation.isPending} />
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: "700", color: colors.text, fontSize: 16 }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
                  >
                    {item.area}, {item.city}
                  </Text>
                  <Text
                    style={{
                      color: colors.brand,
                      fontWeight: "600",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {item.today_booking_count} booking
                    {item.today_booking_count !== 1 ? "s" : ""} today
                  </Text>
                </View>
                <Text style={{ color: colors.brand, fontSize: 22 }}>›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{ color: colors.textSecondary, textAlign: "center", marginTop: 32 }}
              >
                No grounds assigned to you. Ask the ground owner to assign you.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
