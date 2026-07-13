import React from "react";
import { View, Text } from "react-native";
import type { BookingStatus, GroundStatus, SlotStatus } from "@/api/types";

type BadgeVariant = "green" | "amber" | "red" | "grey" | "blue";

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  green: { container: "bg-green-pale", text: "text-green" },
  amber: { container: "bg-amber-pale", text: "text-amber-dark" },
  red: { container: "bg-red-pale", text: "text-red" },
  grey: { container: "bg-pitch-bg", text: "text-pitch-secondary" },
  blue: { container: "bg-blue-50", text: "text-blue-700" },
};

export function Badge({ label, variant, size = "sm" }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <View className={`rounded-full px-2 py-0.5 self-start ${s.container}`}>
      <Text className={`${size === "sm" ? "text-xs" : "text-sm"} font-medium ${s.text}`}>
        {label}
      </Text>
    </View>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { label: string; variant: BadgeVariant }> = {
    on_hold: { label: "On Hold", variant: "amber" },
    confirmed: { label: "Confirmed", variant: "green" },
    arrived: { label: "Arrived", variant: "blue" },
    completed: { label: "Completed", variant: "grey" },
    cancelled: { label: "Cancelled", variant: "red" },
    no_show: { label: "No Show", variant: "red" },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} />;
}

export function GroundStatusBadge({ status }: { status: GroundStatus }) {
  const map: Record<GroundStatus, { label: string; variant: BadgeVariant }> = {
    pending_verification: { label: "Pending", variant: "amber" },
    active: { label: "Live", variant: "green" },
    inactive: { label: "Inactive", variant: "grey" },
    suspended: { label: "Suspended", variant: "red" },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} />;
}

export function SlotStatusBadge({ status }: { status: SlotStatus }) {
  const map: Record<SlotStatus, { label: string; variant: BadgeVariant }> = {
    available: { label: "Available", variant: "green" },
    on_hold: { label: "On Hold", variant: "amber" },
    booked: { label: "Booked", variant: "red" },
    blocked: { label: "Blocked", variant: "grey" },
  };
  const { label, variant } = map[status];
  return <Badge label={label} variant={variant} />;
}
