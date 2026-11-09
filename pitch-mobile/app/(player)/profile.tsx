import React from "react";
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMe, useLogout } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function PlayerProfileScreen() {
  const { user } = useAuthStore();
  const { isLoading: meLoading } = useMe();
  const logoutMutation = useLogout();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
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
            {meLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} />
            ) : null}
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: colors.onAccent, fontSize: 26, fontWeight: "800" }}
              >
                {user.full_name?.[0]?.toUpperCase() ?? "P"}
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
              <LogoutButton onPress={handleLogout} loading={logoutMutation.isPending} />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
