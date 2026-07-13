import React from "react";
import { View, Text } from "react-native";
import { formatPKR } from "@/utils/format";

interface PriceBreakdownProps {
  totalPrice: number;
  advanceAmount: number;
  advancePercent: number;
}

export function PriceBreakdown({
  totalPrice,
  advanceAmount,
  advancePercent,
}: PriceBreakdownProps) {
  const remainder = totalPrice - advanceAmount;

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="text-pitch-text font-bold text-sm mb-3">
        Price Breakdown
      </Text>

      <View className="gap-2">
        <Row label="Slot total" value={formatPKR(totalPrice)} />
        <View className="h-px bg-pitch-border" />
        <Row
          label={`Advance due now (${advancePercent}%)`}
          value={formatPKR(advanceAmount)}
          highlight
        />
        <Row label="Pay at ground" value={formatPKR(remainder)} muted />
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text
        className={`text-sm ${muted ? "text-pitch-secondary" : "text-pitch-text"}`}
      >
        {label}
      </Text>
      <Text
        className={`text-sm font-bold ${
          highlight
            ? "text-green"
            : muted
              ? "text-pitch-secondary"
              : "text-pitch-text"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
