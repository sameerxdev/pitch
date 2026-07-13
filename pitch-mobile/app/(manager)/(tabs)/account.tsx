import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useManagerStore } from "@/stores/managerStore";
import { useLogout } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";

export default function ManagerAccountScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeGround, assignedGrounds, clearActiveGround, releaseActiveGround } =
    useManagerStore();
  const logoutMutation = useLogout();
  const hasMultipleGrounds = assignedGrounds.length > 1;

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

  if (!user) return null;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: "#0D1F15",
              marginBottom: 24,
            }}
          >
            Account
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#1A5C38",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800" }}
              >
                {user.full_name?.[0]?.toUpperCase() ?? "M"}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#0D1F15" }}>
              {user.full_name}
            </Text>
            <Text style={{ color: "#5A7264", marginTop: 4 }}>{user.phone}</Text>
            {user.city && (
              <Text style={{ color: "#5A7264", marginTop: 2 }}>
                📍 {user.city}
              </Text>
            )}
            {user.created_at && (
              <Text style={{ color: "#A0B4A8", fontSize: 12, marginTop: 8 }}>
                Member since {formatDate(user.created_at)}
              </Text>
            )}
          </View>

          {activeGround && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#5A7264",
                  }}
                >
                  Managing now
                </Text>
                {hasMultipleGrounds ? (
                  <TouchableOpacity
                    onPress={() => {
                      releaseActiveGround();
                      router.replace("/(manager)/ground-select" as never);
                    }}
                    style={{
                      backgroundColor: "#E8F3EE",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#1A5C38",
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Switch ↔
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text
                style={{ fontSize: 17, fontWeight: "800", color: "#0D1F15" }}
              >
                {activeGround.name}
              </Text>
              <Text style={{ color: "#5A7264", marginTop: 4, fontSize: 14 }}>
                {activeGround.area}, {activeGround.city}
              </Text>
              {hasMultipleGrounds ? (
                <Text style={{ color: "#A0B4A8", fontSize: 12, marginTop: 8 }}>
                  Tap Switch to manage bookings at another ground.
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>

        <View
          style={{
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2EAE5",
          }}
        >
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "#FDECEA",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#E34C3C", fontWeight: "700", fontSize: 15 }}>
              Log out
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
