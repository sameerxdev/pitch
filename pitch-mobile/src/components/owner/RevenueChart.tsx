import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from "victory-native";
import { format, parseISO } from "date-fns";
import type { DailyBookingVolume } from "@/api/types";

interface RevenueChartProps {
  data: DailyBookingVolume[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No data for this period.</Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    x: format(parseISO(d.date), "dd/MM"),
    y: d.count,
  }));

  const plotWidth = Math.max(chartWidth - 8, 200);
  const barWidth = Math.max(6, Math.min(24, plotWidth / data.length - 4));

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.title}>Booking volume (7 days)</Text>
      {chartWidth > 0 && (
        <View style={styles.chartClip}>
          <VictoryChart
            width={plotWidth}
            height={160}
            theme={VictoryTheme.material}
            padding={{ top: 8, bottom: 36, left: 36, right: 8 }}
            domainPadding={{ x: 12 }}
          >
            <VictoryAxis
              tickFormat={(t, i) => (i % 2 === 0 ? String(t) : "")}
              style={{
                tickLabels: { fontSize: 8, fill: "#5A7264" },
                grid: { stroke: "transparent" },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => (Number.isInteger(t) ? String(t) : "")}
              style={{
                tickLabels: { fontSize: 8, fill: "#5A7264" },
                grid: { stroke: "#E2EAE5", strokeDasharray: "4,4" },
              }}
            />
            <VictoryBar
              data={chartData}
              style={{ data: { fill: "#1A5C38" } }}
              barWidth={barWidth}
            />
          </VictoryChart>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
  },
  chartClip: {
    width: "100%",
    overflow: "hidden",
    alignItems: "flex-start",
  },
  title: {
    color: "#0D1F15",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },
  empty: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#5A7264",
    fontSize: 14,
  },
});
