import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { useBookings, useCancelBooking } from "@/hooks/useBookings";
import { getApiErrorMessage } from "@/api/client";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";
import type { Booking } from "@/api/types";

type TabKey = "upcoming" | "past" | "cancelled";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_MAP: Record<TabKey, string[]> = {
  upcoming: ["confirmed", "arrived", "on_hold"],
  past: ["completed", "no_show"],
  cancelled: ["cancelled"],
};

export default function PlayerBookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  const { data, isLoading, refetch } = useBookings();
  const cancelBooking = useCancelBooking();

  const bookings = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.items) ?? [];
    return all.filter((b) => STATUS_MAP[activeTab].includes(b.status));
  }, [data, activeTab]);

  function handleCancel(item: Booking) {
    Alert.alert(
      "Cancel booking",
      `Cancel your booking at ${item.ground_name}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: () => {
            cancelBooking.mutate(item.id, {
              onSuccess: () => refetch(),
              onError: (err) =>
                Alert.alert("Could not cancel", getApiErrorMessage(err)),
            });
          },
        },
      ],
    );
  }

  const canCancel = (status: Booking["status"]) =>
    status === "on_hold" || status === "confirmed";

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          My Bookings
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 16,
            backgroundColor: "#E2EAE5",
            borderRadius: 12,
            padding: 3,
          }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: activeTab === tab.key ? "#FFFFFF" : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: activeTab === tab.key ? "#0D1F15" : "#5A7264",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading && bookings.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <ActivityIndicator size="large" color="#1A5C38" />
          </View>
        ) : bookings.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <Text style={{ fontSize: 36 }}>📋</Text>
            <Text style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}>
              No {activeTab} bookings yet.
            </Text>
          </View>
        ) : (
          bookings.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                router.push(`/(player)/booking/${item.id}/confirmed` as never)
              }
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                shadowOpacity: 0.05,
                shadowRadius: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontWeight: "700", color: "#0D1F15", flex: 1 }} numberOfLines={1}>
                  {item.ground_name}
                </Text>
                <BookingStatusBadge status={item.status} />
              </View>

              <Text style={{ color: "#5A7264", fontSize: 13 }}>
                {formatDate(item.slot_date)} · {formatSlotRange(item.start_hour, item.end_hour)}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ color: "#5A7264", fontSize: 12 }}>
                  Advance:{" "}
                  <Text style={{ color: "#0D1F15", fontWeight: "600" }}>
                    {formatPKR(item.advance_amount)}
                  </Text>
                </Text>

                {(item.status === "confirmed" || item.status === "arrived") && (
                  <TouchableOpacity
                    onPress={() => router.push(`/(player)/booking/${item.id}/qr` as never)}
                  >
                    <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 13 }}>
                      Show QR
                    </Text>
                  </TouchableOpacity>
                )}

                {item.status === "completed" && !item.review_submitted && (
                  <TouchableOpacity
                    onPress={() => router.push(`/(player)/booking/${item.id}/review` as never)}
                  >
                    <Text style={{ color: "#F5A623", fontWeight: "700", fontSize: 13 }}>
                      Leave review
                    </Text>
                  </TouchableOpacity>
                )}

                {canCancel(item.status) && (
                  <TouchableOpacity
                    onPress={() => handleCancel(item)}
                    disabled={cancelBooking.isPending}
                  >
                    <Text style={{ color: "#E34C3C", fontWeight: "700", fontSize: 13 }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
