import React from "react";
import {
  View,
  Text,
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
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
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
            <Text style={{ color: "#5A7264", fontSize: 12 }}>Managing</Text>
            <Text style={{ color: "#0D1F15", fontSize: 18, fontWeight: "800" }}>
              {activeGround.name}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/scan" as never)}
              style={{
                backgroundColor: "#1A5C38",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 13 }}
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
                  backgroundColor: "#E8F3EE",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{ color: "#1A5C38", fontWeight: "600", fontSize: 13 }}
                >
                  Switch ↔
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Today's date */}
        <Text style={{ color: "#5A7264", fontSize: 13, marginBottom: 16 }}>
          Today — {format(new Date(), "dd MMM yyyy")}
        </Text>

        {/* Slot overview */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Today's Slots
          </Text>
          {slotsLoading ? (
            <ActivityIndicator color="#1A5C38" />
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
            <Text style={{ fontWeight: "700", color: "#0D1F15" }}>
              Upcoming Bookings
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/(tabs)/bookings" as never)}
            >
              <Text
                style={{ color: "#1A5C38", fontWeight: "600", fontSize: 13 }}
              >
                See all →
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
                color: "#5A7264",
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
