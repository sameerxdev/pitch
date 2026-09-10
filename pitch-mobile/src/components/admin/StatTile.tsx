import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StatTileProps {
  label: string;
  value: string | number;
  /** Draws attention to a queue that needs action (e.g. pending verifications). */
  accent?: "default" | "amber" | "red";
}

export function StatTile({ label, value, accent = "default" }: StatTileProps) {
  const valueColor =
    accent === "amber" ? "#B8860B" : accent === "red" ? "#E34C3C" : "#0D1F15";
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
  },
  value: {
    fontWeight: "800",
    fontSize: 20,
  },
  label: {
    color: "#5A7264",
    fontSize: 11,
    marginTop: 4,
  },
});
