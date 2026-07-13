import React from "react";
import { View, Text, ScrollView } from "react-native";
import { getFacilityIcon, isKnownFacilityLabel } from "@/constants/facilities";

interface FacilityChipsProps {
  facilities: string[];
}

export function FacilityChips({ facilities }: FacilityChipsProps) {
  const visible = facilities.filter(isKnownFacilityLabel);
  if (!visible.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
      {visible.map((facility) => (
        <View
          key={facility}
          className="flex-row items-center bg-pitch-bg border border-pitch-border rounded-full px-3 py-1.5 mx-1"
        >
          <Text className="text-sm mr-1">{getFacilityIcon(facility)}</Text>
          <Text className="text-pitch-secondary text-xs capitalize">{facility}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
