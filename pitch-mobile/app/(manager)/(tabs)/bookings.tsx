import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { format } from "date-fns";
import { useManagerStore } from "@/stores/managerStore";
import { useManagerBookings } from "@/hooks/useManagerBookings";
import { BookingRow } from "@/components/manager/BookingRow";
import { SlotCalendar } from "@/components/slot/SlotCalendar";
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "arrived", label: "Arrived" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function ManagerBookingsHeader({
  groundName,
  selectedDate,
  onSelectDate,
  statusFilter,
  onStatusFilter,
}: {
  groundName: string;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  statusFilter: string;
  onStatusFilter: (key: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: "#0D1F15",
          marginBottom: 2,
        }}
      >
        Bookings
      </Text>
      <Text style={{ color: "#5A7264", fontSize: 13, marginBottom: 12 }}>
        {groundName}
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 16,
        }}
      >
        <SlotCalendar
          compact
          allowPast
          maxDaysBack={366}
          maxDaysAhead={366}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </View>

      <Text style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}>
        {format(selectedDate, "dd MMM yyyy")}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: 4 }}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => onStatusFilter(f.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: statusFilter === f.key ? "#1A5C38" : "#FFFFFF",
              borderWidth: 1.5,
              borderColor: statusFilter === f.key ? "#1A5C38" : "#E2EAE5",
            }}
          >
            <Text
              style={{
                color: statusFilter === f.key ? "#FFFFFF" : "#5A7264",
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
  );
}

export default function ManagerBookingsScreen() {
  const { activeGround } = useManagerStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState("all");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useManagerBookings(activeGround?.id ?? "", {
    date: dateStr,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const bookings = data?.pages.flatMap((p) => p.items) ?? [];
  const initialLoading = isLoading && data === undefined;

  if (!activeGround) {
    return null;
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <ManagerBookingsHeader
        groundName={activeGround.name}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {initialLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#1A5C38" />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: "#E34C3C" }}>Could not load bookings.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1A5C38", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={bookings}
          keyExtractor={(b) => b.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => refetch()} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <BookingRow booking={item} groundId={activeGround.id} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 24 }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text
                style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}
              >
                No bookings for this date.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color="#1A5C38"
                style={{ paddingVertical: 16 }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
