import React from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useManagerStore } from "@/stores/managerStore";
import { useLogout } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

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
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ color: colors.white, fontSize: 26, fontWeight: "800" }}
              >
                {user.full_name?.[0]?.toUpperCase() ?? "M"}
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

          {activeGround && (
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
                    color: colors.textSecondary,
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
                      backgroundColor: colors.brandSoft,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.brand,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Switch <Icon name="swap" size={13} />
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text
                style={{ fontSize: 17, fontWeight: "800", color: colors.text }}
              >
                {activeGround.name}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 14 }}>
                {activeGround.area}, {activeGround.city}
              </Text>
              {hasMultipleGrounds ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                  Tap Switch to manage bookings at another ground.
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
