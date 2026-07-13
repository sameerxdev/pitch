import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMe, useLogout, useDeleteAccount } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/api/client";
import { formatDate } from "@/utils/format";

export default function PlayerProfileScreen() {
  const { user } = useAuthStore();
  const { isLoading: meLoading } = useMe();
  const logoutMutation = useLogout();
  const deleteMutation = useDeleteAccount();

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

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(undefined, {
              onError: (err) =>
                Alert.alert("Could not delete account", getApiErrorMessage(err)),
            });
          },
        },
      ],
    );
  }

  if (!user) return null;

  const busy = logoutMutation.isPending || deleteMutation.isPending;

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
            {meLoading ? (
              <ActivityIndicator color="#1A5C38" style={{ marginVertical: 12 }} />
            ) : null}
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
                {user.full_name?.[0]?.toUpperCase() ?? "P"}
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
        </ScrollView>

        <View
          style={{
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2EAE5",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={handleLogout}
            disabled={busy}
            style={{
              backgroundColor: "#FDECEA",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {logoutMutation.isPending ? (
              <ActivityIndicator color="#E34C3C" />
            ) : (
              <Text style={{ color: "#E34C3C", fontWeight: "700", fontSize: 15 }}>
                Log out
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={busy}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#5A7264", fontWeight: "600", fontSize: 14 }}>
              Delete account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
