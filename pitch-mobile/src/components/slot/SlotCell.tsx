import React from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Typography";
import { Colors, fonts } from "@/constants/colors";
import { formatSlotRange, formatPKR } from "@/utils/format";
import type { Slot } from "@/api/types";

interface SlotCellProps {
  slot: Slot;
  isSelected: boolean;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Open",
  on_hold: "On hold",
  booked: "Booked",
  blocked: "Blocked",
  selected: "Selected",
};

export function SlotCell({ slot, isSelected, onPress }: SlotCellProps) {
  const isDisabled =
    slot.status === "on_hold" ||
    slot.status === "booked" ||
    slot.status === "blocked";

  const colorKey = isSelected ? "selected" : slot.status;
  const tone = Colors.slot[colorKey as keyof typeof Colors.slot];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`${formatSlotRange(slot.start_hour, slot.end_hour)}, ${formatPKR(slot.price)}, ${STATUS_LABELS[colorKey] ?? ""}`}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      style={[styles.cell, { backgroundColor: tone.bg, borderColor: tone.border }]}
    >
      <Text
        style={[styles.time, { color: tone.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {formatSlotRange(slot.start_hour, slot.end_hour)}
      </Text>
      <Text style={[styles.price, { color: tone.text }]} numberOfLines={1}>
        {formatPKR(slot.price)}
      </Text>
      <Text style={[styles.status, { color: tone.text }]} numberOfLines={1}>
        {STATUS_LABELS[colorKey] ?? slot.status}
      </Text>
    </PressableScale>
  );
}

export function SlotLegend() {
  const items: Array<{ status: keyof typeof Colors.slot; label: string }> = [
    { status: "available", label: "Open" },
    { status: "on_hold", label: "On hold" },
    { status: "booked", label: "Booked" },
    { status: "selected", label: "Selected" },
  ];

  return (
    <View className="flex-row flex-wrap gap-4 mt-5">
      {items.map(({ status, label }) => {
        const tone = Colors.slot[status];
        return (
          <View key={status} className="flex-row items-center gap-1.5">
            <View style={[styles.swatch, { backgroundColor: tone.bg, borderColor: tone.border }]} />
            <Text className="text-pitch-secondary text-xs">{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 92,
  },
  time: { fontFamily: fonts.display, fontSize: 17 },
  price: { fontSize: 12, fontWeight: "700", marginTop: 3 },
  status: { fontSize: 11, marginTop: 3, opacity: 0.8 },
  swatch: { width: 12, height: 12, borderRadius: 4, borderWidth: 1.5 },
});
