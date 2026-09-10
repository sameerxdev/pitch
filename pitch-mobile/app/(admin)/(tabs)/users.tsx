import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useAdminUsers, useUpdateAdminUser } from "@/hooks/useAdmin";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { formatDate, maskPhone } from "@/utils/format";
import type { AdminUser, UserRole } from "@/api/types";

type Filter = { key: string; label: string; role?: string };

const FILTERS: Filter[] = [
  { key: "all", label: "All" },
  { key: "player", label: "Players", role: "player" },
  { key: "manager", label: "Managers", role: "manager" },
  { key: "owner", label: "Owners", role: "ground_owner" },
  { key: "admin", label: "Admins", role: "admin" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  player: "Player",
  manager: "Manager",
  ground_owner: "Ground owner",
  admin: "Admin",
};

/** Owner promotion has no self-signup path, so it's done from here. */
const PROMOTABLE: UserRole[] = ["player", "ground_owner"];

export default function AdminUsersScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useAdminUsers({
    role: filter.role,
    search: submittedSearch || undefined,
  });

  const updateMutation = useUpdateAdminUser();
  const users = data?.pages.flatMap((p) => p.items) ?? [];

  function handleToggleSuspend(user: AdminUser) {
    const suspending = !user.is_suspended;
    Alert.alert(
      suspending ? "Suspend account?" : "Restore account?",
      suspending
        ? `${user.full_name ?? user.phone} will be signed out and blocked from the app.`
        : `${user.full_name ?? user.phone} will be able to sign in again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: suspending ? "Suspend" : "Restore",
          style: suspending ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({
                userId: user.id,
                isSuspended: suspending,
              });
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  function handleToggleOwner(user: AdminUser) {
    const promoting = user.role !== "ground_owner";
    Alert.alert(
      promoting ? "Make ground owner?" : "Demote to player?",
      promoting
        ? `${user.full_name ?? user.phone} will be able to list and manage grounds.`
        : `${user.full_name ?? user.phone} loses access to their grounds dashboard.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({
                userId: user.id,
                role: promoting ? "ground_owner" : "player",
              });
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>Users</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setSubmittedSearch(search.trim())}
          returnKeyType="search"
          placeholder="Search name or phone"
          placeholderTextColor="#A0B4A8"
          style={{
            marginTop: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: "#0D1F15",
            borderWidth: 1.5,
            borderColor: "#E2EAE5",
          }}
        />
      </View>

      <View style={{ flexGrow: 0, marginTop: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: filter.key === f.key ? "#1A5C38" : "#FFFFFF",
                borderWidth: 1.5,
                borderColor: filter.key === f.key ? "#1A5C38" : "#E2EAE5",
              }}
            >
              <Text
                style={{
                  color: filter.key === f.key ? "#FFFFFF" : "#5A7264",
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1A5C38" />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <Text style={{ color: "#E34C3C", textAlign: "center" }}>
            {getApiErrorMessage(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1A5C38", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
          }
          renderItem={({ item }) => {
            const isSelf = item.id === currentUser?.id;
            return (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{ fontWeight: "700", color: "#0D1F15", fontSize: 15 }}
                      numberOfLines={1}
                    >
                      {item.full_name ?? "Unnamed user"}
                      {isSelf ? " (you)" : ""}
                    </Text>
                    <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 2 }}>
                      {maskPhone(item.phone)}
                      {item.city ? ` · ${item.city}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Badge label={ROLE_LABELS[item.role]} variant="blue" />
                    {item.is_suspended && <Badge label="Suspended" variant="red" />}
                  </View>
                </View>

                <Text style={{ color: "#A0B4A8", fontSize: 12, marginTop: 10 }}>
                  Joined {formatDate(item.created_at)}
                  {item.ground_count !== undefined
                    ? ` · ${item.ground_count} ground${item.ground_count === 1 ? "" : "s"}`
                    : ""}
                  {item.booking_count !== undefined
                    ? ` · ${item.booking_count} booking${item.booking_count === 1 ? "" : "s"}`
                    : ""}
                </Text>

                {!isSelf && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {PROMOTABLE.includes(item.role) && (
                      <TouchableOpacity
                        disabled={updateMutation.isPending}
                        onPress={() => handleToggleOwner(item)}
                        style={{ ...actionBtn, backgroundColor: "#E8F3EE" }}
                      >
                        <Text
                          style={{ color: "#1A5C38", fontWeight: "700", fontSize: 13 }}
                        >
                          {item.role === "ground_owner"
                            ? "Demote to player"
                            : "Make owner"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      disabled={updateMutation.isPending}
                      onPress={() => handleToggleSuspend(item)}
                      style={{
                        ...actionBtn,
                        backgroundColor: item.is_suspended ? "#E8F3EE" : "#FDECEA",
                      }}
                    >
                      <Text
                        style={{
                          color: item.is_suspended ? "#1A5C38" : "#E34C3C",
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        {item.is_suspended ? "Restore" : "Suspend"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Text style={{ fontSize: 36 }}>👥</Text>
              <Text style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}>
                No users match this filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const actionBtn = {
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 9,
};
