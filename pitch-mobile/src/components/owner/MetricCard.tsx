import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

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
          {Math.abs(trendPercent).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  value: {
    color: colors.text,
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
  trendNeutral: { color: colors.textSecondary },
  trendUp: { color: colors.brand },
  trendDown: { color: colors.danger },
});
