import React from "react";
import { Stack } from "expo-router";
import { colors } from "@/constants/colors";
import { RoleGuard } from "@/components/RoleGuard";

export const unstable_settings = {
  anchor: "ground-select",
};

export default function ManagerLayout() {
  return (
    <RoleGuard role="manager">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RoleGuard>
  );
}
