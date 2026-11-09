import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

interface StatTileProps {
  label: string;
  value: string | number;
  /** Draws attention to a queue that needs action (e.g. pending verifications). */
  accent?: "default" | "amber" | "red";
}

export function StatTile({ label, value, accent = "default" }: StatTileProps) {
  const valueColor =
    accent === "amber" ? colors.amber : accent === "red" ? colors.danger : colors.text;
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
  },
  value: {
    fontWeight: "800",
    fontSize: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
});
