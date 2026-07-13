import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";

export default function AdminHomeScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F3F5F2",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 36 }}>🛡️</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: "#0D1F15", marginTop: 16 }}>
        Admin Panel
      </Text>
      <Text style={{ color: "#5A7264", textAlign: "center", marginTop: 8 }}>
        Admin actions are primarily handled via the web dashboard.{"\n"}
        Mobile admin read-only view — coming in Phase 2.
      </Text>

      <TouchableOpacity
        onPress={() => logout()}
        style={{
          marginTop: 40,
          backgroundColor: "#FDECEA",
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 40,
        }}
      >
        <Text style={{ color: "#E34C3C", fontWeight: "700", fontSize: 15 }}>
          Log out / Switch role
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
