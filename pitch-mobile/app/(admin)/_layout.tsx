import React from "react";
import { Stack } from "expo-router";
import { RoleGuard } from "@/components/RoleGuard";

export default function AdminLayout() {
  return (
    <RoleGuard role="admin">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
