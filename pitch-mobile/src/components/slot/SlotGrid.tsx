import React from "react";
import { View, Text } from "react-native";
import { SlotCell } from "./SlotCell";
import type { Slot } from "@/api/types";

interface SlotGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
}

const COLS = 3;

export function SlotGrid({
  slots,
  selectedSlotId,
  onSelectSlot,
}: SlotGridProps) {
  if (!slots.length) {
    return (
      <View className="py-12 items-center">
        <Text className="text-pitch-secondary text-center">
          No slots available for this date.
        </Text>
      </View>
    );
  }

  const sorted = [...slots].sort((a, b) => a.start_hour - b.start_hour);
  const rows: Slot[][] = [];
  for (let i = 0; i < sorted.length; i += COLS) {
    rows.push(sorted.slice(i, i + COLS));
  }

  return (
    <View className="gap-5">
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row gap-4">
          {row.map((slot) => (
            <View key={slot.id} className="flex-1">
              <SlotCell
                slot={slot}
                isSelected={slot.id === selectedSlotId}
                onPress={() => onSelectSlot(slot)}
              />
            </View>
          ))}
          {row.length < COLS &&
            Array.from({ length: COLS - row.length }).map((_, idx) => (
              <View key={`empty-${idx}`} className="flex-1" />
            ))}
        </View>
      ))}
    </View>
  );
}
