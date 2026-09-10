import React from "react";
import { Stack } from "expo-router";
import { RoleGuard } from "@/components/RoleGuard";

export default function OwnerRootLayout() {
  return (
    <RoleGuard role="ground_owner">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
