import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";
import { getFacilityIcon, isKnownFacilityLabel } from "@/constants/facilities";

interface FacilityChipsProps {
  facilities: string[];
}

export function FacilityChips({ facilities }: FacilityChipsProps) {
  const visible = facilities.filter(isKnownFacilityLabel);
  if (!visible.length) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {visible.map((facility) => (
        <View
          key={facility}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 999,
            paddingHorizontal: 13,
            paddingVertical: 9,
          }}
        >
          <Icon name={getFacilityIcon(facility)} size={15} color={colors.brand} />
          <Text style={{ fontSize: 13, fontWeight: "600", textTransform: "capitalize" }}>
            {facility}
          </Text>
        </View>
      ))}
    </View>
  );
}
