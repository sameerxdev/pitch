import React from "react";
import { Stack } from "expo-router";

export default function ManagerLayout() {
  return (
    <Stack
      initialRouteName="ground-select"
      screenOptions={{ headerShown: false }}
    />
  );
}
