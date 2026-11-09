import React from "react";
import { StyleSheet, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import type { DailyBookingVolume } from "@/api/types";

interface RevenueChartProps {
  data: DailyBookingVolume[];
}

const PLOT_HEIGHT = 150;
const Y_AXIS_WIDTH = 26;
const TICK_COUNT = 4;
const X_LABEL_WIDTH = 32;

/** Smallest round step that fits `max` into the chart's tick count. */
function niceStep(max: number) {
  const target = Math.max(1, Math.ceil(max / TICK_COUNT));
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= target) ?? 10;
  return step * magnitude;
}

/** Weekdays for a week; only the 1st and every 5th for a month. */
function xLabel(date: Date, isMonth: boolean) {
  if (!isMonth) return format(date, "EEE");
  const day = date.getDate();
  return day === 1 || day % 5 === 0 ? String(day) : "";
}

export function RevenueChart({ data }: RevenueChartProps) {
  const isMonth = data.length > 7;
  const step = niceStep(Math.max(0, ...data.map((d) => d.count)));
  const top = step * TICK_COUNT;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => step * (TICK_COUNT - i));

  return (
    <View>
      <Text style={styles.title}>Bookings per day</Text>
      <Text style={styles.axisTitle}>Bookings</Text>

      <View style={{ flexDirection: "row", height: PLOT_HEIGHT }}>
        <View style={{ width: Y_AXIS_WIDTH }}>
          {ticks.map((tick) => (
            <Text
              key={tick}
              style={[styles.yTick, { top: (1 - tick / top) * PLOT_HEIGHT - 7 }]}
            >
              {tick}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          {ticks.map((tick) => (
            <View
              key={tick}
              style={[styles.gridLine, tick === 0 && styles.baseline, { top: (1 - tick / top) * PLOT_HEIGHT }]}
            />
          ))}
          <View style={styles.bars}>
            {data.map((d) => (
              <View key={d.date} style={styles.barColumn}>
                <View
                  accessibilityLabel={`${format(parseISO(d.date), "d MMM")}: ${d.count} bookings`}
                  style={[
                    styles.bar,
                    {
                      width: isMonth ? "62%" : "52%",
                      height: d.count > 0 ? Math.max(3, (d.count / top) * PLOT_HEIGHT) : 0,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.xAxis}>
        {data.map((d, i) => (
          <Text
            key={d.date}
            style={[styles.xTick, { left: `${((i + 0.5) / data.length) * 100}%` }]}
          >
            {xLabel(parseISO(d.date), isMonth)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  axisTitle: { fontSize: 10, color: colors.textSecondary, marginBottom: 8 },
  yTick: {
    position: "absolute",
    left: 0,
    width: Y_AXIS_WIDTH - 6,
    textAlign: "right",
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  baseline: { opacity: 1, backgroundColor: colors.borderStrong },
  bars: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { backgroundColor: colors.accent, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  xAxis: { height: 16, marginTop: 6, marginLeft: Y_AXIS_WIDTH },
  xTick: {
    position: "absolute",
    width: X_LABEL_WIDTH,
    marginLeft: -X_LABEL_WIDTH / 2,
    textAlign: "center",
    fontSize: 10,
    color: colors.textSecondary,
  },
});
