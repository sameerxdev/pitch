import React, { useMemo, useState } from "react";
import {
  View,
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
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.bg }}>
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
            <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
              <Icon name="back" size={20} />
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
              Select a Slot
            </Text>
            {ground?.name ? (
              <Text
                style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}
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
            backgroundColor: colors.surface,
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

        <Text style={{ fontWeight: "700", color: colors.text, marginBottom: 12 }}>
          Available Slots — {format(selectedDate, "dd MMM")}
        </Text>

        {slotsLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 24 }} />
        ) : (
          <SlotGrid
            slots={bookableSlots}
            selectedSlotId={selectedSlot?.id ?? null}
            onSelectSlot={setSelectedSlot}
          />
        )}

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>
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
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedSlot || submitting}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: !selectedSlot || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
              {selectedSlot
                ? `Continue  ${formatSlotRange(selectedSlot.start_hour, selectedSlot.end_hour)}`
                : "Select a slot to continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
