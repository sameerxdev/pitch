import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isAfter,
  isToday,
  min,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Typography";
import { SlotCalendar } from "@/components/slot/SlotCalendar";
import { colors } from "@/constants/colors";
import { hapticTap } from "@/utils/haptics";
import type { AnalyticsRange } from "@/api/types";

const PERIODS: Array<{ key: AnalyticsRange; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = { weekStartsOn: 1 } as const;

function periodStart(period: AnalyticsRange, date: Date) {
  if (period === "day") return startOfDay(date);
  return period === "week" ? startOfWeek(date, WEEK) : startOfMonth(date);
}

function shift(period: AnalyticsRange, date: Date, by: number) {
  if (period === "day") return addDays(date, by);
  return period === "week" ? addWeeks(date, by) : addMonths(date, by);
}

export function periodLabel(period: AnalyticsRange, date: Date) {
  if (period === "day") {
    return `${isToday(date) ? "Today" : format(date, "EEE")}, ${format(date, "d MMM yyyy")}`;
  }
  if (period === "week") {
    return `${format(startOfWeek(date, WEEK), "d MMM")} – ${format(endOfWeek(date, WEEK), "d MMM yyyy")}`;
  }
  return format(date, "MMMM yyyy");
}

export function useAnalyticsFilter(initial: AnalyticsRange) {
  const [period, setPeriod] = useState<AnalyticsRange>(initial);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  return { period, setPeriod, anchor, setAnchor, anchorKey: format(anchor, "yyyy-MM-dd") };
}

interface PeriodFilterProps {
  period: AnalyticsRange;
  anchor: Date;
  onPeriodChange: (period: AnalyticsRange) => void;
  onAnchorChange: (anchor: Date) => void;
}

/** Day / Week / Month tabs with arrows and a picker for browsing past periods. */
export function PeriodFilter({ period, anchor, onPeriodChange, onAnchorChange }: PeriodFilterProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = startOfDay(new Date());
  const canGoNext = !isAfter(periodStart(period, shift(period, anchor, 1)), today);

  function move(by: number) {
    hapticTap();
    onAnchorChange(min([shift(period, anchor, by), today]));
  }

  function choose(date: Date) {
    onAnchorChange(min([date, today]));
    setPickerOpen(false);
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.tabs}>
        {PERIODS.map((p) => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => {
                hapticTap();
                onPeriodChange(p.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.navigator}>
        <TouchableOpacity
          onPress={() => move(-1)}
          accessibilityLabel={`Previous ${period}`}
          style={styles.arrow}
        >
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Choose ${period}. Showing ${periodLabel(period, anchor)}`}
          style={styles.current}
        >
          <Icon name="calendar" size={16} color={colors.accent} />
          <Text style={styles.currentText} numberOfLines={1}>
            {periodLabel(period, anchor)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => move(1)}
          disabled={!canGoNext}
          accessibilityLabel={`Next ${period}`}
          style={[styles.arrow, !canGoNext && { opacity: 0.3 }]}
        >
          <Icon name="chevronRight" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {period === "day" ? "Choose a day" : period === "week" ? "Choose any day in the week" : "Choose a month"}
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} accessibilityLabel="Close">
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {period === "month" ? (
              <MonthGrid selected={anchor} today={today} onSelect={choose} />
            ) : (
              <SlotCalendar
                selectedDate={anchor}
                onSelectDate={choose}
                allowPast
                maxDaysBack={730}
                maxDate={today}
                rangeHighlight={
                  period === "week"
                    ? { start: startOfWeek(anchor, WEEK), end: endOfWeek(anchor, WEEK) }
                    : undefined
                }
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MonthGrid({
  selected,
  today,
  onSelect,
}: {
  selected: Date;
  today: Date;
  onSelect: (date: Date) => void;
}) {
  const [year, setYear] = useState(selected.getFullYear());
  const months = useMemo(() => MONTHS.map((name, month) => ({ name, month })), []);
  const canGoNext = year < today.getFullYear();

  return (
    <View>
      <View style={styles.yearRow}>
        <TouchableOpacity onPress={() => setYear(year - 1)} accessibilityLabel="Previous year" style={styles.arrow}>
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.year}>{year}</Text>
        <TouchableOpacity
          onPress={() => setYear(year + 1)}
          disabled={!canGoNext}
          accessibilityLabel="Next year"
          style={[styles.arrow, !canGoNext && { opacity: 0.3 }]}
        >
          <Icon name="chevronRight" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.monthGrid}>
        {months.map(({ name, month }) => {
          const first = new Date(year, month, 1);
          const disabled = isAfter(first, today);
          const active = selected.getFullYear() === year && selected.getMonth() === month;
          return (
            <View key={name} style={{ width: "33.33%", padding: 4 }}>
              <TouchableOpacity
                disabled={disabled}
                onPress={() => onSelect(first)}
                style={[styles.month, active && styles.tabActive, disabled && { opacity: 0.3 }]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{name}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  tabTextActive: { color: colors.onAccent },
  navigator: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  current: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  currentText: { fontSize: 14, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  year: { fontSize: 16, fontWeight: "800" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", margin: -4 },
  month: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
  },
});
