import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  isSameDay,
  min,
  startOfDay,
} from "date-fns";
import { SlotCalendar } from "@/components/slot/SlotCalendar";

export const DEFAULT_MAX_RANGE_SPAN_DAYS = 90;

export type DateSelectionMode = "single" | "range";

export type DateRangeValue = {
  from: Date;
  to: Date;
};

type ActiveField = "from" | "to";

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  mode: DateSelectionMode;
  onModeChange: (mode: DateSelectionMode) => void;
  /** When true, dates before today cannot be selected. */
  disablePast?: boolean;
  /** Days after today that can be selected. */
  maxDaysAhead?: number;
  /** Maximum inclusive span from start to end (range mode only). */
  maxSpanDays?: number;
};

export function validateDateRange(
  from: Date,
  to: Date,
  maxSpanDays: number,
  mode: DateSelectionMode,
): string | null {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (mode === "single") return null;
  if (isBefore(end, start)) {
    return "End date must be on or after the start date.";
  }
  const span = differenceInCalendarDays(end, start) + 1;
  if (span > maxSpanDays) {
    return `Date range cannot exceed ${maxSpanDays} days.`;
  }
  return null;
}

export function DateRangeCalendarPicker({
  value,
  onChange,
  mode,
  onModeChange,
  disablePast = true,
  maxDaysAhead = 365,
  maxSpanDays = DEFAULT_MAX_RANGE_SPAN_DAYS,
}: Props) {
  const [activeField, setActiveField] = useState<ActiveField>("from");

  const today = startOfDay(new Date());
  const absoluteMin = disablePast ? today : startOfDay(addDays(today, -365));
  const absoluteMax = startOfDay(addDays(today, maxDaysAhead));

  const rangeError = useMemo(
    () => validateDateRange(value.from, value.to, maxSpanDays, mode),
    [value.from, value.to, maxSpanDays, mode],
  );

  const spanDays =
    mode === "single"
      ? 1
      : differenceInCalendarDays(startOfDay(value.to), startOfDay(value.from)) +
        1;

  const calendarMin =
    mode === "range" && activeField === "to"
      ? startOfDay(value.from)
      : absoluteMin;
  const calendarMax =
    mode === "range" && activeField === "to"
      ? min([
          startOfDay(addDays(value.from, maxSpanDays - 1)),
          absoluteMax,
        ])
      : absoluteMax;

  function handleSelect(day: Date) {
    const picked = startOfDay(day);

    if (disablePast && isBefore(picked, today)) {
      return;
    }

    if (mode === "single") {
      onChange({ from: picked, to: picked });
      return;
    }

    if (activeField === "from") {
      let nextTo = value.to;
      if (isBefore(nextTo, picked)) {
        nextTo = picked;
      } else if (differenceInCalendarDays(nextTo, picked) + 1 > maxSpanDays) {
        nextTo = startOfDay(addDays(picked, maxSpanDays - 1));
      }
      onChange({ from: picked, to: nextTo });
      setActiveField("to");
      return;
    }

    if (isBefore(picked, startOfDay(value.from))) {
      Alert.alert(
        "Invalid end date",
        "The end date cannot be before the start date.",
      );
      return;
    }
    if (differenceInCalendarDays(picked, value.from) + 1 > maxSpanDays) {
      Alert.alert(
        "Range too long",
        `Choose an end date within ${maxSpanDays} days of the start date.`,
      );
      return;
    }
    onChange({ ...value, to: picked });
  }

  function switchMode(next: DateSelectionMode) {
    onModeChange(next);
    if (next === "single") {
      onChange({ from: value.from, to: value.from });
    }
    setActiveField("from");
  }

  function DateChip({
    field,
    label,
    date,
  }: {
    field: ActiveField;
    label: string;
    date: Date;
  }) {
    const active = mode === "range" && activeField === field;
    return (
      <TouchableOpacity
        onPress={() => mode === "range" && setActiveField(field)}
        disabled={mode === "single"}
        style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor:
            mode === "single" || active ? "#1A5C38" : "#E2EAE5",
          backgroundColor:
            mode === "single" || active ? "#E8F3EE" : "#F3F5F2",
        }}
      >
        <Text style={{ color: "#5A7264", fontSize: 11, marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ color: "#0D1F15", fontWeight: "700", fontSize: 14 }}>
          {format(date, "dd MMM yyyy")}
        </Text>
      </TouchableOpacity>
    );
  }

  const selectedCalendarDate =
    mode === "single"
      ? value.from
      : activeField === "from"
        ? value.from
        : value.to;

  const rangeHighlight =
    mode === "range" && !isSameDay(value.from, value.to)
      ? { start: value.from, end: value.to }
      : undefined;

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#E2EAE5",
          borderRadius: 10,
          padding: 3,
          marginBottom: 12,
        }}
      >
        {(
          [
            { key: "single" as const, label: "Single date" },
            { key: "range" as const, label: "Date range" },
          ] as const
        ).map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => switchMode(opt.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: mode === opt.key ? "#FFFFFF" : "transparent",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 12,
                color: mode === opt.key ? "#0D1F15" : "#5A7264",
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "single" ? (
        <DateChip field="from" label="Date" date={value.from} />
      ) : (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <DateChip field="from" label="From" date={value.from} />
          <DateChip field="to" label="To" date={value.to} />
        </View>
      )}

      <Text style={{ color: "#A0B4A8", fontSize: 11, marginBottom: 8 }}>
        {mode === "single"
          ? "Tap a date on the calendar (today onward)"
          : activeField === "from"
            ? "Tap a start date on the calendar"
            : "Tap an end date on the calendar"}
        {" · "}
        {spanDays} day{spanDays === 1 ? "" : "s"} selected
      </Text>

      <View
        style={{
          backgroundColor: "#F3F5F2",
          borderRadius: 12,
          padding: 10,
        }}
      >
        <SlotCalendar
          compact
          selectedDate={selectedCalendarDate}
          onSelectDate={handleSelect}
          minDate={calendarMin}
          maxDate={calendarMax}
          rangeHighlight={rangeHighlight}
        />
      </View>

      {rangeError ? (
        <Text style={{ color: "#E34C3C", fontSize: 12, marginTop: 8 }}>
          {rangeError}
        </Text>
      ) : (
        <Text style={{ color: "#5A7264", fontSize: 11, marginTop: 8 }}>
          {disablePast ? "Past dates are disabled. " : ""}
          {mode === "range" ? `Max range: ${maxSpanDays} days.` : ""}
        </Text>
      )}
    </View>
  );
}
