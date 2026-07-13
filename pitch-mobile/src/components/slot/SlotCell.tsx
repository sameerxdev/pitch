import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { formatSlotRange, formatPKR } from "@/utils/format";
import type { Slot } from "@/api/types";

interface SlotCellProps {
  slot: Slot;
  isSelected: boolean;
  onPress: () => void;
}

export function SlotCell({ slot, isSelected, onPress }: SlotCellProps) {
  const isDisabled =
    slot.status === "on_hold" ||
    slot.status === "booked" ||
    slot.status === "blocked";

  const colorKey = isSelected ? "selected" : slot.status;
  const colors = Colors.slot[colorKey as keyof typeof Colors.slot];

  const statusLabels: Record<string, string> = {
    available: "Available",
    on_hold: "On Hold",
    booked: "Booked",
    blocked: "Blocked",
    selected: "Selected",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`${formatSlotRange(slot.start_hour, slot.end_hour)}, ${formatPKR(slot.price)}, ${statusLabels[colorKey] ?? ""}`}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1.5,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: "center",
        minHeight: 96,
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.88}
      >
        {formatSlotRange(slot.start_hour, slot.end_hour)}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 13,
          marginTop: 4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {formatPKR(slot.price)}
      </Text>
      <Text
        style={{ color: colors.text, fontSize: 11, marginTop: 4, opacity: 0.88 }}
        numberOfLines={1}
      >
        {isSelected ? "Selected" : statusLabels[slot.status] ?? slot.status}
      </Text>
    </TouchableOpacity>
  );
}

interface SlotLegendProps {}

export function SlotLegend(_: SlotLegendProps) {
  const items: Array<{ status: keyof typeof Colors.slot; label: string }> = [
    { status: "available", label: "Available" },
    { status: "on_hold", label: "On Hold" },
    { status: "booked", label: "Booked" },
    { status: "selected", label: "Selected" },
  ];

  return (
    <View className="flex-row flex-wrap gap-3 mt-3">
      {items.map(({ status, label }) => {
        const colors = Colors.slot[status];
        return (
          <View key={status} className="flex-row items-center gap-1">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: colors.bg,
                borderWidth: 1.5,
                borderColor: colors.border,
              }}
            />
            <Text className="text-pitch-secondary text-xs">{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
