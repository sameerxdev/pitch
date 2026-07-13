import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View style={{ padding: 24, flex: 1 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#0D1F15",
            marginBottom: 8,
          }}
        >
          Select Ground
        </Text>
        <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 24 }}>
          {grounds.length > 1
            ? "You manage multiple grounds. Choose which one to work on."
            : "Choose the ground you want to manage today."}
        </Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#1A5C38"
            style={{ marginTop: 48 }}
          />
        ) : isError ? (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ color: "#E34C3C", textAlign: "center" }}>
              {getApiErrorMessage(error)}
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16 }}>
              <Text style={{ color: "#1A5C38", fontWeight: "700" }}>
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
              <TouchableOpacity
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={{
                  marginTop: 8,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 14,
                  backgroundColor: "#FDECEA",
                }}
              >
                <Text
                  style={{ color: "#E34C3C", fontWeight: "700", fontSize: 15 }}
                >
                  Log out
                </Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: "700", color: "#0D1F15", fontSize: 16 }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{ color: "#5A7264", fontSize: 13, marginTop: 2 }}
                  >
                    {item.area}, {item.city}
                  </Text>
                  <Text
                    style={{
                      color: "#1A5C38",
                      fontWeight: "600",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {item.today_booking_count} booking
                    {item.today_booking_count !== 1 ? "s" : ""} today
                  </Text>
                </View>
                <Text style={{ color: "#1A5C38", fontSize: 22 }}>›</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={{ color: "#5A7264", textAlign: "center", marginTop: 32 }}
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
