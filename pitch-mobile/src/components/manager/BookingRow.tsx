import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { formatPKR, formatSlotRange } from "@/utils/format";
import type { Booking } from "@/api/types";

interface BookingRowProps {
  booking: Booking;
  groundId: string;
}

export function BookingRow({ booking, groundId }: BookingRowProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(manager)/booking/${booking.id}` as never)}
      className="bg-white rounded-xl p-4 mb-2 shadow-sm"
      accessibilityRole="button"
      accessibilityLabel={`Booking ${formatSlotRange(booking.start_hour, booking.end_hour)}, ${booking.player_name ?? "Player"}, ${booking.player_phone ?? ""}`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-pitch-text font-bold text-base flex-1 pr-2">
          {formatSlotRange(booking.start_hour, booking.end_hour)}
        </Text>
        <BookingStatusBadge status={booking.status} />
      </View>

      <View className="flex-row items-stretch gap-4 pt-3 border-t border-[#E2EAE5]">
        <View className="flex-1 min-w-0 flex-col justify-center gap-0">
          <Text
            className="text-pitch-text text-base font-semibold"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {booking.player_name ?? "Player"}
          </Text>
          <Text
            className="text-pitch-secondary text-base"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {booking.player_phone ?? "—"}
          </Text>
        </View>

        <View className="shrink-0 flex-col justify-center items-end gap-0.5">
          <Text className="text-pitch-secondary text-xs">Advance</Text>
          <Text className="text-pitch-text font-medium text-sm">
            {formatPKR(booking.advance_amount)}
          </Text>
        </View>

        <View className="shrink-0 flex-col justify-center items-end gap-0.5">
          <Text className="text-pitch-secondary text-xs">Remainder</Text>
          <Text className="text-pitch-text font-medium text-sm">
            {formatPKR(booking.total_price - booking.advance_amount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
