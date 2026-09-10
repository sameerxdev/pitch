import React from "react";
import { Stack } from "expo-router";
import { RoleGuard } from "@/components/RoleGuard";

export default function ManagerLayout() {
  return (
    <RoleGuard role="manager">
      <Stack
        initialRouteName="ground-select"
        screenOptions={{ headerShown: false }}
      />
    </RoleGuard>
  );
}
