import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatTrend } from "@/utils/format";

interface MetricCardProps {
  label: string;
  value: string;
  trendPercent: number;
}

export function MetricCard({ label, value, trendPercent }: MetricCardProps) {
  const isPositive = trendPercent > 0;
  const isNeutral = trendPercent === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      <View style={styles.trendRow}>
        <Text
          style={[
            styles.trend,
            isNeutral
              ? styles.trendNeutral
              : isPositive
                ? styles.trendUp
                : styles.trendDown,
          ]}
          numberOfLines={1}
        >
          {isNeutral ? "" : isPositive ? "↑ " : "↓ "}
          {formatTrend(Math.abs(trendPercent))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
  },
  label: {
    color: "#5A7264",
    fontSize: 11,
    marginBottom: 4,
  },
  value: {
    color: "#0D1F15",
    fontWeight: "800",
    fontSize: 15,
  },
  trendRow: {
    marginTop: 4,
  },
  trend: {
    fontSize: 10,
    fontWeight: "700",
  },
  trendNeutral: { color: "#5A7264" },
  trendUp: { color: "#1A5C38" },
  trendDown: { color: "#E34C3C" },
});
