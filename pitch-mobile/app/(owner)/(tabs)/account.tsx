import React from "react";
import { View, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/utils/format";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

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
      style={{ flex: 1, backgroundColor: colors.bg }}
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
              color: colors.text,
              marginBottom: 24,
            }}
          >
            Profile
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
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: colors.white, fontSize: 26, fontWeight: "800" }}
              >
                {user.full_name?.[0]?.toUpperCase() ?? "O"}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
              {user.full_name}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{user.phone}</Text>
            {user.city && (
              <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                <Icon name="location" size={13} />{" "}{user.city}
              </Text>
            )}
            {user.created_at && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                Member since {formatDate(user.created_at)}
              </Text>
            )}
            <View style={{ position: "absolute", top: 16, right: 16 }}>
              <LogoutButton onPress={handleLogout} />
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              Ground owner
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Assign managers from each ground’s Edit screen. Managers check in
              players and handle day-to-day bookings for that location.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
