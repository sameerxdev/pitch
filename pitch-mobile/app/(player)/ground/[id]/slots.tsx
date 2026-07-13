import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { SlotCalendar } from "@/components/slot/SlotCalendar";
import { SlotGrid } from "@/components/slot/SlotGrid";
import { SlotLegend } from "@/components/slot/SlotCell";
import { createBooking } from "@/api/bookings";
import { getApiErrorMessage } from "@/api/client";
import { useGround, useGroundSlots } from "@/hooks/useGrounds";
import { formatSlotRange } from "@/utils/format";
import { getPlayerBookableDates } from "@/utils/playerBookableDates";
import type { Slot } from "@/api/types";

export default function SlotCalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: ground } = useGround(id ?? "");
  const {
    data: slots = [],
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useGroundSlots(id ?? "", dateStr);

  const availableDates = useMemo(
    () => getPlayerBookableDates().map((d) => format(d, "yyyy-MM-dd")),
    [],
  );

  const bookableSlots = slots.filter(
    (s) => s.status === "available" || s.status === "on_hold",
  );

  async function handleContinue() {
    if (!selectedSlot || !id) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createBooking({
        slot_id: selectedSlot.id,
        ground_id: id,
      });
      router.push({
        pathname: "/(player)/booking/summary",
        params: {
          bookingId: result.booking_id,
          advanceAmount: String(result.advance_amount),
          totalPrice: String(result.total_price),
          holdExpiresAt: result.hold_expires_at,
          groundId: id,
          groundName: ground?.name ?? "",
          groundArea: ground?.area ?? "",
          advancePercent: String(ground?.advance_percent ?? 30),
          slotDate: dateStr,
          startHour: String(selectedSlot.start_hour),
          endHour: String(selectedSlot.end_hour),
          slotId: selectedSlot.id,
        },
      } as never);
    } catch (err) {
      setError(getApiErrorMessage(err));
      refetchSlots();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#F3F5F2" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (id) router.replace(`/(player)/ground/${id}` as never);
            }}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
              ←
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0D1F15" }}>
              Select a Slot
            </Text>
            {ground?.name ? (
              <Text
                style={{ color: "#5A7264", fontSize: 12, marginTop: 2 }}
                numberOfLines={1}
              >
                {ground.name}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
      >
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
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            availableDates={availableDates}
            maxDaysAhead={availableDates.length}
          />
        </View>

        <Text style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}>
          Available Slots — {format(selectedDate, "dd MMM")}
        </Text>

        {slotsLoading ? (
          <ActivityIndicator color="#1A5C38" style={{ marginVertical: 24 }} />
        ) : (
          <SlotGrid
            slots={bookableSlots}
            selectedSlotId={selectedSlot?.id ?? null}
            onSelectSlot={setSelectedSlot}
          />
        )}

        {error ? (
          <Text style={{ color: "#E34C3C", fontSize: 13, marginTop: 12 }}>
            {error}
          </Text>
        ) : null}

        <SlotLegend />
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2EAE5",
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedSlot || submitting}
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: !selectedSlot || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {selectedSlot
                ? `Continue  ${formatSlotRange(selectedSlot.start_hour, selectedSlot.end_hour)} →`
                : "Select a slot to continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
