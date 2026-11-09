import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { useManagerStore } from "@/stores/managerStore";
import {
  useManagerSlots,
  useManagerBookings,
} from "@/hooks/useManagerBookings";
import { SlotGrid } from "@/components/slot/SlotGrid";
import { BookingRow } from "@/components/manager/BookingRow";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { activeGround, assignedGrounds, releaseActiveGround } =
    useManagerStore();
  const hasMultipleGrounds = assignedGrounds.length > 1;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: slots = [], isLoading: slotsLoading } = useManagerSlots(
    activeGround?.id ?? "",
    todayStr,
  );

  const { data: bookingsData } = useManagerBookings(activeGround?.id ?? "", {
    date: todayStr,
    status: "confirmed,arrived",
  });

  const upcomingBookings = bookingsData?.pages[0]?.items.slice(0, 5) ?? [];

  if (!activeGround) {
    return null;
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      {/* Top bar */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Managing</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
              {activeGround.name}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/scan" as never)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{ color: colors.white, fontWeight: "600", fontSize: 13 }}
              >
                Scan QR
              </Text>
            </TouchableOpacity>
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
                  style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}
                >
                  Switch <Icon name="swap" size={13} />
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Today's date */}
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
          Today — {format(new Date(), "dd MMM yyyy")}
        </Text>

        {/* Slot overview */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: colors.text, marginBottom: 12 }}
          >
            Today's Slots
          </Text>
          {slotsLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <SlotGrid
              slots={slots}
              selectedSlotId={null}
              onSelectSlot={() => {}}
            />
          )}
        </View>

        {/* Upcoming bookings */}
        <View style={{ marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.text }}>
              Upcoming Bookings
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/(tabs)/bookings" as never)}
            >
              <Text
                style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}
              >
                See all <Icon name="forward" size={15} />
              </Text>
            </TouchableOpacity>
          </View>
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((b) => (
              <BookingRow key={b.id} booking={b} groundId={activeGround.id} />
            ))
          ) : (
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                paddingVertical: 16,
              }}
            >
              No upcoming bookings today.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
