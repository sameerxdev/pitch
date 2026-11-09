import React from "react";
import { View, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/utils/format";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Text } from "@/components/ui/Typography";
import { IconBadge } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function AdminAccountScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
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
              color: colors.text,
              marginBottom: 24,
            }}
          >
            Account
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
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
                backgroundColor: colors.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <IconBadge name="shield" size={26} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
              {user.full_name ?? "Administrator"}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{user.phone}</Text>
            {user.created_at && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                Admin since {formatDate(user.created_at)}
              </Text>
            )}
            <View style={{ position: "absolute", top: 16, right: 16 }}>
              <LogoutButton onPress={handleLogout} />
            </View>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              What you can do here
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
              Approve or reject new grounds, suspend grounds and accounts, promote
              players to ground owners, and hide reviews that breach the content
              policy. Hidden reviews stop counting toward a ground's rating.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
