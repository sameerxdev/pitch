import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  startOfDay,
  addDays,
  subDays,
  isWithinInterval,
} from "date-fns";

interface SlotCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  availableDates?: string[];
  maxDaysAhead?: number;
  /** Tighter layout for slot picker (smaller month grid). */
  compact?: boolean;
  /**
   * When true, dates before today are selectable (e.g. manager booking history).
   * Default false — player slot flow only allows today onward.
   */
  allowPast?: boolean;
  /** How far back selectable days go when `allowPast` is true. Default 366. */
  maxDaysBack?: number;
  /** Override default selectable window (used by date-range pickers). */
  minDate?: Date;
  maxDate?: Date;
  /** Inclusive highlight for a selected range (e.g. from–to). */
  rangeHighlight?: { start: Date; end: Date };
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function SlotCalendar({
  selectedDate,
  onSelectDate,
  availableDates = [],
  maxDaysAhead = 90,
  compact = false,
  allowPast = false,
  maxDaysBack = 366,
  minDate,
  maxDate,
  rangeHighlight,
}: SlotCalendarProps) {
  const today = startOfDay(new Date());
  const rangeStart =
    minDate ??
    (allowPast ? startOfDay(subDays(today, maxDaysBack)) : today);
  const rangeEnd =
    maxDate ?? startOfDay(addDays(today, maxDaysAhead));

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
  }, [selectedDayKey, selectedDate]);

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  });

  const firstDayOfWeek = startOfMonth(viewMonth).getDay();

  function monthCanShow(monthStart: Date): boolean {
    const monthEnd = endOfMonth(monthStart);
    return (
      !isBefore(monthEnd, rangeStart) && !isAfter(monthStart, rangeEnd)
    );
  }

  function handlePrevMonth() {
    const prev = subMonths(viewMonth, 1);
    if (monthCanShow(prev)) {
      setViewMonth(prev);
    }
  }

  function handleNextMonth() {
    const next = addMonths(viewMonth, 1);
    if (monthCanShow(next)) {
      setViewMonth(next);
    }
  }

  function isDisabled(day: Date): boolean {
    const d = startOfDay(day);
    return isBefore(d, rangeStart) || isAfter(d, rangeEnd);
  }

  function hasAvailableSlot(day: Date): boolean {
    const dateStr = format(day, "yyyy-MM-dd");
    return availableDates.includes(dateStr);
  }

  const prevMonth = subMonths(viewMonth, 1);
  const nextMonth = addMonths(viewMonth, 1);
  const canPrev = monthCanShow(prevMonth);
  const canNext = monthCanShow(nextMonth);

  return (
    <View>
      {/* Month header */}
      <View
        className={`flex-row items-center justify-between ${compact ? "mb-2" : "mb-4"}`}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          disabled={!canPrev}
          className={compact ? "w-8 h-8 items-center justify-center" : "w-10 h-10 items-center justify-center"}
          accessibilityLabel="Previous month"
          style={{ opacity: canPrev ? 1 : 0.35 }}
        >
          <Text className={`text-pitch-text ${compact ? "text-lg" : "text-xl"}`}>‹</Text>
        </TouchableOpacity>
        <Text
          className={`text-pitch-text font-bold ${compact ? "text-sm" : "text-base"}`}
        >
          {format(viewMonth, "MMMM yyyy")}
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          disabled={!canNext}
          className={compact ? "w-8 h-8 items-center justify-center" : "w-10 h-10 items-center justify-center"}
          accessibilityLabel="Next month"
          style={{ opacity: canNext ? 1 : 0.35 }}
        >
          <Text className={`text-pitch-text ${compact ? "text-lg" : "text-xl"}`}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View className={compact ? "flex-row mb-0.5" : "flex-row mb-1"}>
        {WEEKDAYS.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text
              className={`text-pitch-secondary font-medium ${compact ? "text-[10px]" : "text-xs"}`}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <View
            key={`empty-${i}`}
            className={
              compact
                ? "w-[14.28%] h-8 items-center justify-center"
                : "w-[14.28%] aspect-square"
            }
          />
        ))}

        {days.map((day) => {
          const disabled = isDisabled(day);
          const selected = isSameDay(day, selectedDate);
          const todayDay = isToday(day);
          const hasDot = hasAvailableSlot(day) && !disabled;
          const inRange =
            rangeHighlight &&
            !disabled &&
            isWithinInterval(startOfDay(day), {
              start: startOfDay(rangeHighlight.start),
              end: startOfDay(rangeHighlight.end),
            });
          const isRangeEnd =
            rangeHighlight &&
            (isSameDay(day, rangeHighlight.start) ||
              isSameDay(day, rangeHighlight.end));

          return (
            <View
              key={day.toISOString()}
              className={
                compact
                  ? "w-[14.28%] h-8 items-center justify-center"
                  : "w-[14.28%] aspect-square items-center justify-center"
              }
            >
              <TouchableOpacity
                onPress={() => !disabled && onSelectDate(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={format(day, "EEEE, MMMM d")}
                accessibilityState={{ selected, disabled }}
                style={[
                  compact
                    ? {
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }
                    : {
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                  selected
                    ? { backgroundColor: "#1A5C38" }
                    : inRange
                      ? { backgroundColor: "#E8F3EE" }
                      : {},
                  !selected && todayDay && !inRange
                    ? { borderWidth: 1, borderColor: "#1A5C38" }
                    : {},
                  isRangeEnd && !selected
                    ? { borderWidth: 1.5, borderColor: "#1A5C38" }
                    : {},
                ]}
              >
                <Text
                  style={{
                    fontSize: compact ? 12 : 14,
                    fontWeight: "600",
                    color: selected
                      ? "#FFFFFF"
                      : disabled
                        ? "#A0B4A8"
                        : inRange
                          ? "#1A5C38"
                          : "#0D1F15",
                  }}
                >
                  {format(day, "d")}
                </Text>
              </TouchableOpacity>
              {hasDot && !selected && (
                <View className="w-1 h-1 rounded-full bg-green mt-0.5" />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
