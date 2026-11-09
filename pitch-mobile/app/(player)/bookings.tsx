import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { useBookings, useCancelBooking } from "@/hooks/useBookings";
import { getApiErrorMessage } from "@/api/client";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";
import { format, isValid, parseISO } from "date-fns";
import { PressableScale } from "@/components/ui/PressableScale";
import { BookingCardSkeleton } from "@/components/ui/Skeleton";
import type { Booking } from "@/api/types";
import { Text } from "@/components/ui/Typography";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { colors, fonts } from "@/constants/colors";

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
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
          My Bookings
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 16,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 4,
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
                backgroundColor: activeTab === tab.key ? colors.accent : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: activeTab === tab.key ? colors.onAccent : colors.textSecondary,
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
          <>
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </>
        ) : bookings.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <IconBadge name="clipboard" size={32} />
            <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 16 }}>
              No {activeTab} bookings yet.
            </Text>
          </View>
        ) : (
          bookings.map((item) => (
            <PressableScale
              key={item.id}
              onPress={() =>
                router.push(`/(player)/booking/${item.id}/confirmed` as never)
              }
              style={styles.card}
            >
              <View style={{ flexDirection: "row", gap: 14 }}>
                <DateTile date={item.slot_date} />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.ground} numberOfLines={1}>
                      {item.ground_name}
                    </Text>
                    <BookingStatusBadge status={item.status} />
                  </View>
                  <Text style={styles.time}>
                    <Icon name="clock" size={12} /> {formatSlotRange(item.start_hour, item.end_hour)}
                  </Text>
                  <Text style={styles.advance}>
                    Advance{" "}
                    <Text style={{ fontWeight: "700" }}>{formatPKR(item.advance_amount)}</Text>
                  </Text>
                </View>
              </View>

              {(item.status === "confirmed" ||
                item.status === "arrived" ||
                canCancel(item.status) ||
                (item.status === "completed" && !item.review_submitted)) && (
                <View style={styles.actions}>
                  {(item.status === "confirmed" || item.status === "arrived") && (
                    <TouchableOpacity
                      style={styles.action}
                      onPress={() => router.push(`/(player)/booking/${item.id}/qr` as never)}
                    >
                      <Icon name="qr" size={15} color={colors.accent} />
                      <Text style={[styles.actionText, { color: colors.accent }]}>Show pass</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === "completed" && !item.review_submitted && (
                    <TouchableOpacity
                      style={styles.action}
                      onPress={() => router.push(`/(player)/booking/${item.id}/review` as never)}
                    >
                      <Icon name="star" size={15} color={colors.amber} />
                      <Text style={[styles.actionText, { color: colors.accent }]}>Leave review</Text>
                    </TouchableOpacity>
                  )}
                  {canCancel(item.status) && (
                    <TouchableOpacity
                      style={styles.action}
                      onPress={() => handleCancel(item)}
                      disabled={cancelBooking.isPending}
                    >
                      <Text style={[styles.actionText, { color: colors.danger }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </PressableScale>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DateTile({ date }: { date: string }) {
  const d = parseISO(date);
  const ok = isValid(d);
  return (
    <View style={styles.dateTile}>
      <Text style={styles.dateDay}>{ok ? format(d, "dd") : "--"}</Text>
      <Text style={styles.dateMonth}>{ok ? format(d, "MMM").toUpperCase() : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  ground: { flex: 1, fontSize: 15, fontWeight: "800" },
  time: { fontSize: 13, color: colors.textSecondary },
  advance: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  dateTile: {
    width: 58,
    height: 66,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.accent },
  dateMonth: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: colors.accentLight },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontWeight: "700" },
});
