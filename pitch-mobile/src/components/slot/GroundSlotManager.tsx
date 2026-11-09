import React, { useMemo, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { format, addDays, startOfDay, isBefore, parseISO } from "date-fns";
import { SlotCalendar } from "@/components/slot/SlotCalendar";
import {
  DateRangeCalendarPicker,
  validateDateRange,
  DEFAULT_MAX_RANGE_SPAN_DAYS,
  type DateSelectionMode,
} from "@/components/slot/DateRangeCalendarPicker";
import { SlotLegend } from "@/components/slot/SlotCell";
import { formatPKR, formatHour12, formatSlotRange } from "@/utils/format";
import { getApiErrorMessage } from "@/api/client";
import {
  useGroundSlotAdmin,
  type SlotAdminRole,
} from "@/hooks/useGroundSlotAdmin";
import {
  inferRateType,
  slotPriceFromTemplate,
  validateManualSlotTemplate,
  type ManualSlotTemplate,
} from "@/utils/slotTemplates";
import type { RateType, SkippedSlot, Slot, SlotStatus } from "@/api/types";
import { Icon } from "@/components/ui/Icon";
import { Text, TextInput } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

type Props = {
  groundId: string;
  /** Which set of endpoints to talk to. Managers and owners have separate routes. */
  role?: SlotAdminRole;
};

const EMPTY_DRAFT: ManualSlotTemplate = {
  start_hour: 18,
  end_hour: 20,
  rate_type: "night",
};

function RateTypeToggle({
  value,
  onChange,
}: {
  value: RateType;
  onChange: (v: RateType) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {(["day", "night"] as const).map((type) => (
        <TouchableOpacity
          key={type}
          onPress={() => onChange(type)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: value === type ? colors.brand : colors.border,
            backgroundColor: value === type ? colors.brandSoft : colors.surface,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              fontSize: 13,
              color: value === type ? colors.brand : colors.textSecondary,
              textTransform: "capitalize",
            }}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Horizontal pill picker — taps to pick an hour, shows 12-hour AM/PM labels. */
function HourPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (hour: number) => void;
  /** Lowest selectable hour (inclusive). */
  min: number;
  /** Highest selectable hour (inclusive). */
  max: number;
}) {
  const options = useMemo(() => {
    const out: number[] = [];
    for (let h = min; h <= max; h++) out.push(h);
    return out;
  }, [min, max]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {options.map((h) => {
        const selected = h === value;
        return (
          <TouchableOpacity
            key={h}
            onPress={() => onChange(h)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: selected ? colors.brand : colors.border,
              backgroundColor: selected ? colors.brandSoft : colors.surface,
              minWidth: 76,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 13,
                color: selected ? colors.brand : colors.textSecondary,
              }}
            >
              {formatHour12(h)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const MAX_SKIPPED_SHOWN = 6;

function describeSkipped(skipped: SkippedSlot[]): string {
  const lines = skipped.slice(0, MAX_SKIPPED_SHOWN).map((s) => {
    const day = format(parseISO(s.date), "dd MMM");
    const time = formatSlotRange(s.start_hour, s.end_hour);
    if (s.reason === "overlap") {
      return `${day}: ${time} overlaps ${formatSlotRange(s.conflict_start_hour, s.conflict_end_hour)}`;
    }
    return `${day}: ${time} is ${s.reason === "booked" ? "already booked" : "on hold"}`;
  });
  const hidden = skipped.length - MAX_SKIPPED_SHOWN;
  return hidden > 0 ? [...lines, `and ${hidden} more`].join("\n") : lines.join("\n");
}

export function GroundSlotManager({ groundId, role = "manager" }: Props) {
  const today = startOfDay(new Date());

  const [dateMode, setDateMode] = useState<DateSelectionMode>("single");
  const [dateRange, setDateRange] = useState({
    from: today,
    to: today,
  });
  const [previewDate, setPreviewDate] = useState(today);
  const previewDateStr = format(previewDate, "yyyy-MM-dd");

  const {
    ground,
    isGroundLoading,
    slots: previewSlots,
    updateSlot: updateSlotMutation,
    applySlots: applySlotsMutation,
  } = useGroundSlotAdmin(groundId, role, previewDateStr);

  const [hourlyDay, setHourlyDay] = useState(2000);
  const [hourlyNight, setHourlyNight] = useState(3000);

  const [draft, setDraft] = useState<ManualSlotTemplate>({ ...EMPTY_DRAFT });
  const [draftPrice, setDraftPrice] = useState("");
  const [slotTemplates, setSlotTemplates] = useState<ManualSlotTemplate[]>([]);
  // True after the manager taps Day/Night themselves — prevents the start-hour
  // auto-suggest from overwriting their explicit choice on subsequent edits.
  const [rateTypeOverridden, setRateTypeOverridden] = useState(false);

  React.useEffect(() => {
    if (!ground) return;
    setHourlyDay(ground.hourly_rate_day);
    setHourlyNight(ground.hourly_rate_night);
  }, [ground?.hourly_rate_day, ground?.hourly_rate_night]);

  const draftPreviewPrice = slotPriceFromTemplate(
    {
      ...draft,
      price: draftPrice ? Number(draftPrice) : undefined,
    },
    hourlyDay,
    hourlyNight,
  );

  const applyDateLabel =
    dateMode === "single"
      ? format(dateRange.from, "dd MMM yyyy")
      : `${format(dateRange.from, "dd MMM")} – ${format(dateRange.to, "dd MMM yyyy")}`;

  function addDraftToList() {
    const template: ManualSlotTemplate = {
      ...draft,
      price: draftPrice ? Number(draftPrice) : undefined,
    };
    const err = validateManualSlotTemplate(template);
    if (err) {
      Alert.alert("Invalid slot", err);
      return;
    }
    const overlap = slotTemplates.some(
      (s) =>
        template.start_hour < s.end_hour && template.end_hour > s.start_hour,
    );
    if (overlap) {
      Alert.alert(
        "Overlap",
        "This time overlaps another slot in your list. Adjust times or remove the other slot.",
      );
      return;
    }
    setSlotTemplates((prev) =>
      [...prev, template].sort((a, b) => a.start_hour - b.start_hour),
    );
    setDraft({ ...EMPTY_DRAFT });
    setDraftPrice("");
    setRateTypeOverridden(false);
  }

  function removeTemplate(index: number) {
    setSlotTemplates((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleApplySlots() {
    const rangeError = validateDateRange(
      dateRange.from,
      dateRange.to,
      DEFAULT_MAX_RANGE_SPAN_DAYS,
      dateMode,
    );
    if (rangeError) {
      Alert.alert("Invalid dates", rangeError);
      return;
    }
    if (isBefore(startOfDay(dateRange.from), today)) {
      Alert.alert("Invalid date", "Cannot add slots for past dates.");
      return;
    }
    if (slotTemplates.length === 0) {
      Alert.alert("No slots", "Add at least one time slot to the list below.");
      return;
    }

    const fromDate = format(dateRange.from, "yyyy-MM-dd");
    const toDate =
      dateMode === "single"
        ? fromDate
        : format(dateRange.to, "yyyy-MM-dd");

    try {
      const result = await applySlotsMutation.mutateAsync({
        from_date: fromDate,
        to_date: toDate,
        hourly_rate_day: hourlyDay,
        hourly_rate_night: hourlyNight,
        slots: slotTemplates.map((t) => ({
          start_hour: t.start_hour,
          end_hour: t.end_hour,
          rate_type: t.rate_type,
          price: t.price,
        })),
      });
      const saved = result.total_slots_upserted;
      if (saved > 0) {
        setSlotTemplates([]);
        setPreviewDate(startOfDay(dateRange.from));
      }
      if (result.skipped.length === 0) {
        Alert.alert("Slots saved", `Added ${saved} slot(s) for ${applyDateLabel}.`);
      } else {
        Alert.alert(
          saved > 0 ? "Some slots were skipped" : "No slots added",
          `${saved > 0 ? `Added ${saved} slot(s). ` : ""}These were not added:\n\n${describeSkipped(result.skipped)}`,
        );
      }
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }

  function toggleSlotStatus(slot: Slot) {
    if (slot.status === "booked") {
      Alert.alert("Booked", "This slot already has a booking.");
      return;
    }
    const next: SlotStatus =
      slot.status === "blocked" ? "available" : "blocked";
    updateSlotMutation.mutate({
      slotId: slot.id,
      date: previewDateStr,
      updates: { status: next },
    });
  }

  if (isGroundLoading) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!ground) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary }}>Ground not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginBottom: 16,
          lineHeight: 20,
        }}
      >
        Add each bookable window (e.g. 12–2 AM, 5–7 AM, 4–6 PM) with day or
        night rate. Apply to one date or a range. Gaps with no slots stay
        unbookable.
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={sectionTitle}>When to apply</Text>
        <DateRangeCalendarPicker
          value={dateRange}
          onChange={setDateRange}
          mode={dateMode}
          onModeChange={setDateMode}
          disablePast
          maxDaysAhead={365}
          maxSpanDays={DEFAULT_MAX_RANGE_SPAN_DAYS}
        />

        <Text style={[sectionTitle, { marginTop: 16 }]}>
          Default rates (PKR / hour)
        </Text>
        <Text style={hint}>
          Used to calculate each slot price unless you enter a fixed price.
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabel}>Day</Text>
            <TextInput
              value={String(hourlyDay)}
              onChangeText={(v) => setHourlyDay(Number(v) || 0)}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={fieldLabel}>Night</Text>
            <TextInput
              value={String(hourlyNight)}
              onChangeText={(v) => setHourlyNight(Number(v) || 0)}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
        </View>

        <Text style={sectionTitle}>Add a time slot</Text>
        <Text style={hint}>
          Tap a start time and an end time. Day / Night is auto-set from the
          start time; tap to override.
        </Text>

        <Text style={fieldLabel}>Start time</Text>
        <HourPicker
          value={draft.start_hour}
          min={0}
          max={23}
          onChange={(start_hour) =>
            setDraft((d) => {
              // Keep end strictly after start; bump by 2h if needed.
              const end_hour =
                d.end_hour <= start_hour ? Math.min(24, start_hour + 2) : d.end_hour;
              return {
                ...d,
                start_hour,
                end_hour,
                rate_type: rateTypeOverridden ? d.rate_type : inferRateType(start_hour),
              };
            })
          }
        />
        <Text style={[timeHint, { marginBottom: 12 }]}>
          Selected: {formatHour12(draft.start_hour)}
        </Text>

        <Text style={fieldLabel}>End time</Text>
        <HourPicker
          value={draft.end_hour}
          min={Math.max(1, draft.start_hour + 1)}
          max={24}
          onChange={(end_hour) => setDraft((d) => ({ ...d, end_hour }))}
        />
        <Text style={[timeHint, { marginBottom: 12 }]}>
          Selected: {formatHour12(draft.end_hour)}
        </Text>

        <Text style={[fieldLabel, { marginBottom: 6 }]}>
          Slot type{" "}
          <Text style={{ color: colors.textMuted, fontWeight: "400" }}>
            (auto from start time — tap to change)
          </Text>
        </Text>
        <RateTypeToggle
          value={draft.rate_type}
          onChange={(rate_type) => {
            setRateTypeOverridden(true);
            setDraft((d) => ({ ...d, rate_type }));
          }}
        />

        <View style={{ marginTop: 12 }}>
          <Text style={fieldLabel}>Fixed price (optional)</Text>
          <TextInput
            value={draftPrice}
            onChangeText={setDraftPrice}
            placeholder={`Auto: ${formatPKR(draftPreviewPrice)}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[inputStyle, { marginTop: 4 }]}
          />
        </View>

        <TouchableOpacity
          onPress={addDraftToList}
          style={{
            marginTop: 12,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.brand,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.brand, fontWeight: "700" }}>
            + Add to list
          </Text>
        </TouchableOpacity>

        {slotTemplates.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={sectionTitle}>
              Slots to apply ({slotTemplates.length})
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="calendar" size={14} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>
                {applyDateLabel}
              </Text>
            </View>
            {slotTemplates.map((t, idx) => (
              <View
                key={`${t.start_hour}-${t.end_hour}-${idx}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderTopWidth: idx > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                }}
              >
                <View>
                  <Text style={{ fontWeight: "600", color: colors.text }}>
                    {formatSlotRange(t.start_hour, t.end_hour)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t.rate_type === "day" ? "Day" : "Night"} ·{" "}
                    {formatPKR(
                      slotPriceFromTemplate(t, hourlyDay, hourlyNight),
                    )}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeTemplate(idx)}>
                  <Text style={{ color: colors.danger, fontWeight: "600" }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={handleApplySlots}
          disabled={applySlotsMutation.isPending || slotTemplates.length === 0}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 16,
            opacity: slotTemplates.length === 0 ? 0.5 : 1,
          }}
        >
          {applySlotsMutation.isPending ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={{ color: colors.onAccent, fontWeight: "700", fontSize: 15 }}>
              Apply slots to selected date
              {dateMode === "range" ? "s" : ""}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: "700", color: colors.text, marginBottom: 8 }}>
        Preview — {format(previewDate, "dd MMM yyyy")}
      </Text>
      <Text style={[hint, { marginBottom: 10 }]}>
        Block closes a slot for maintenance or a private game. Players can't
        see or book blocked slots. Tap a slot to block or unblock it.
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <SlotCalendar
          compact
          selectedDate={previewDate}
          onSelectDate={(d) => {
            if (!isBefore(startOfDay(d), today)) setPreviewDate(d);
          }}
          minDate={today}
          maxDate={startOfDay(addDays(today, 365))}
        />
      </View>

      {previewSlots.length === 0 ? (
        <Text
          style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 12 }}
        >
          No slots for this date. Add slots above and apply to this day.
        </Text>
      ) : (
        <View style={{ marginBottom: 8 }}>
          {previewSlots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              onPress={() => toggleSlotStatus(slot)}
              disabled={slot.status === "booked"}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                opacity: slot.status === "booked" ? 0.7 : 1,
              }}
            >
              <View>
                <Text style={{ fontWeight: "600", color: colors.text }}>
                  {formatSlotRange(slot.start_hour, slot.end_hour)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {slot.rate_type === "day" ? "Day" : "Night"} ·{" "}
                  {formatPKR(slot.price)}
                </Text>
              </View>
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 12,
                  color:
                    slot.status === "available"
                      ? colors.brand
                      : slot.status === "blocked"
                        ? colors.danger
                        : colors.textSecondary,
                }}
              >
                {slot.status === "available"
                  ? "Block"
                  : slot.status === "blocked"
                    ? "Unblock"
                    : slot.status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <SlotLegend />
    </ScrollView>
  );
}

const sectionTitle = {
  fontWeight: "700" as const,
  color: colors.text,
  fontSize: 14,
  marginBottom: 8,
};
const fieldLabel = {
  color: colors.textSecondary,
  fontSize: 12,
  marginBottom: 4,
};
const hint = {
  color: colors.textMuted,
  fontSize: 11,
  marginBottom: 8,
  lineHeight: 16,
};
const timeHint = {
  color: colors.textMuted,
  fontSize: 10,
  marginTop: 4,
};
const inputStyle = {
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
  color: colors.text,
  backgroundColor: colors.bg,
};
