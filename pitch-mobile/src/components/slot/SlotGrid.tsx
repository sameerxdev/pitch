import React from "react";
import { View } from "react-native";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { SlotCell } from "./SlotCell";
import type { Slot } from "@/api/types";

interface SlotGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
}

const COLS = 3;

export function SlotGrid({ slots, selectedSlotId, onSelectSlot }: SlotGridProps) {
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
  const sections: Array<{ title: string; icon: IconName; items: Slot[] }> = [
    { title: "Day", icon: "sun", items: sorted.filter((s) => s.rate_type === "day") },
    { title: "Night", icon: "moon", items: sorted.filter((s) => s.rate_type !== "day") },
  ];

  return (
    <View className="gap-6">
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <View key={section.title} className="gap-3">
            <View className="flex-row items-center gap-2">
              <Icon name={section.icon} size={16} color={colors.accent} />
              <Text style={{ fontSize: 15, fontWeight: "800" }}>{section.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {section.items.length} {section.items.length === 1 ? "slot" : "slots"}
              </Text>
            </View>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -5 }}>
              {section.items.map((slot) => (
                <View key={slot.id} style={{ width: `${100 / COLS}%`, padding: 5 }}>
                  <SlotCell
                    slot={slot}
                    isSelected={slot.id === selectedSlotId}
                    onPress={() => onSelectSlot(slot)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
    </View>
  );
}
