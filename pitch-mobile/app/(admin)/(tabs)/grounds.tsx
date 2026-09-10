import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import {
  useAdminGrounds,
  useSetGroundStatus,
  useVerifyGround,
} from "@/hooks/useAdmin";
import { getApiErrorMessage } from "@/api/client";
import { GroundStatusBadge } from "@/components/ui/Badge";
import { formatPKR, maskPhone } from "@/utils/format";
import type { AdminGround } from "@/api/types";

type Filter = { key: string; label: string; status?: string };

const FILTERS: Filter[] = [
  { key: "pending", label: "Pending", status: "pending_verification" },
  { key: "active", label: "Active", status: "active" },
  { key: "suspended", label: "Suspended", status: "suspended" },
  { key: "inactive", label: "Inactive", status: "inactive" },
  { key: "all", label: "All" },
];

export default function AdminGroundsScreen() {
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);
  const [search, setSearch] = useState("");
  // Only the committed value hits the API — avoids a request per keystroke.
  const [submittedSearch, setSubmittedSearch] = useState("");
  // Rejection needs a free-text reason; Alert.prompt is iOS-only, so this is
  // collected in a modal that works on both platforms.
  const [rejecting, setRejecting] = useState<AdminGround | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useAdminGrounds({
    status: filter.status,
    search: submittedSearch || undefined,
  });

  const verifyMutation = useVerifyGround();
  const statusMutation = useSetGroundStatus();
  const grounds = data?.pages.flatMap((p) => p.items) ?? [];
  const busy = verifyMutation.isPending || statusMutation.isPending;

  function handleApprove(ground: AdminGround) {
    Alert.alert(
      "Approve ground?",
      `${ground.name} will go live and become bookable by players.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await verifyMutation.mutateAsync({
                groundId: ground.id,
                approve: true,
              });
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  async function submitRejection() {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("Reason required", "Enter why the ground is being rejected.");
      return;
    }
    try {
      await verifyMutation.mutateAsync({
        groundId: rejecting.id,
        approve: false,
        reason,
      });
      setRejecting(null);
      setRejectReason("");
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }

  function handleToggleSuspend(ground: AdminGround) {
    const suspending = ground.status !== "suspended";
    Alert.alert(
      suspending ? "Suspend ground?" : "Restore ground?",
      suspending
        ? `${ground.name} will stop accepting new bookings immediately.`
        : `${ground.name} will return to active and accept bookings again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: suspending ? "Suspend" : "Restore",
          style: suspending ? "destructive" : "default",
          onPress: async () => {
            try {
              await statusMutation.mutateAsync({
                groundId: ground.id,
                status: suspending ? "suspended" : "active",
                reason: suspending ? "Suspended by administrator." : undefined,
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
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          Grounds
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setSubmittedSearch(search.trim())}
          returnKeyType="search"
          placeholder="Search name, area or city"
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
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 8,
            paddingBottom: 8,
          }}
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
          data={grounds}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
          }
          renderItem={({ item }) => (
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
                    style={{ fontWeight: "700", color: "#0D1F15", fontSize: 16 }}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 2 }}>
                    {item.area}, {item.city}
                  </Text>
                </View>
                <GroundStatusBadge status={item.status} />
              </View>

              <Text style={{ color: "#5A7264", fontSize: 12, marginTop: 10 }}>
                Owner: {item.owner_name ?? "Unnamed"}
                {item.owner_phone ? ` · ${maskPhone(item.owner_phone)}` : ""}
              </Text>
              <Text style={{ color: "#5A7264", fontSize: 12, marginTop: 2 }}>
                {formatPKR(item.hourly_rate_day)}/hr day ·{" "}
                {formatPKR(item.hourly_rate_night)}/hr night · {item.advance_percent}% advance
              </Text>
              <Text style={{ color: "#A0B4A8", fontSize: 12, marginTop: 2 }}>
                {item.manager_count} manager{item.manager_count === 1 ? "" : "s"} ·{" "}
                {item.booking_count} booking{item.booking_count === 1 ? "" : "s"} ·{" "}
                {item.photos.length} photo{item.photos.length === 1 ? "" : "s"}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {item.status === "pending_verification" ? (
                  <>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => {
                        setRejectReason("");
                        setRejecting(item);
                      }}
                      style={{ ...actionBtn, backgroundColor: "#FDECEA" }}
                    >
                      <Text style={{ color: "#E34C3C", fontWeight: "700", fontSize: 13 }}>
                        Reject
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => handleApprove(item)}
                      style={{ ...actionBtn, backgroundColor: "#1A5C38" }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                        Approve
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() => handleToggleSuspend(item)}
                    style={{
                      ...actionBtn,
                      backgroundColor:
                        item.status === "suspended" ? "#E8F3EE" : "#FDECEA",
                    }}
                  >
                    <Text
                      style={{
                        color: item.status === "suspended" ? "#1A5C38" : "#E34C3C",
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {item.status === "suspended" ? "Restore" : "Suspend"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Text style={{ fontSize: 36 }}>🏟️</Text>
              <Text style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}>
                {filter.key === "pending"
                  ? "Nothing waiting for verification."
                  : "No grounds match this filter."}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!rejecting}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(13,31,21,0.45)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#0D1F15" }}>
              Reject ground
            </Text>
            <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 6, lineHeight: 19 }}>
              {rejecting?.name} will be set to inactive. The owner is notified with
              the reason below.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Photos don't show the pitch clearly"
              placeholderTextColor="#A0B4A8"
              multiline
              autoFocus
              maxLength={500}
              style={{
                marginTop: 14,
                minHeight: 80,
                borderWidth: 1.5,
                borderColor: "#E2EAE5",
                borderRadius: 12,
                padding: 12,
                color: "#0D1F15",
                textAlignVertical: "top",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={() => setRejecting(null)}
                style={{ ...actionBtn, backgroundColor: "#F3F5F2" }}
              >
                <Text style={{ color: "#5A7264", fontWeight: "700", fontSize: 13 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRejection}
                disabled={busy || !rejectReason.trim()}
                style={{
                  ...actionBtn,
                  backgroundColor: "#E34C3C",
                  opacity: rejectReason.trim() ? 1 : 0.5,
                }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                    Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const actionBtn = {
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 9,
};
