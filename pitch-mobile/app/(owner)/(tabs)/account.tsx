import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/utils/format";

export default function OwnerAccountScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void logout();
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
            Profile
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
                {user.full_name?.[0]?.toUpperCase() ?? "O"}
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

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#5A7264",
                marginBottom: 8,
              }}
            >
              Ground owner
            </Text>
            <Text style={{ color: "#5A7264", fontSize: 14, lineHeight: 20 }}>
              Assign managers from each ground’s Edit screen. Managers check in
              players and handle day-to-day bookings for that location.
            </Text>
          </View>
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
