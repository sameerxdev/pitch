import React from "react";
import { TabIcon, useTabScreenOptions, HIDDEN_TAB } from "@/components/ui/tabs";
import { Tabs } from "expo-router";

import { RoleGuard } from "@/components/RoleGuard";

export default function PlayerLayout() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <RoleGuard role="player">
      <Tabs
        screenOptions={tabScreenOptions}
      >
        {/* ── Visible tabs ── */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Browse",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="stadium" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="explore" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: "Bookings",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="bookings" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <TabIcon icon="profile" focused={focused} />
            ),
          }}
        />

        {/* ── Hidden routes (no tab icon) ── */}
        <Tabs.Screen name="ground/[id]" options={HIDDEN_TAB} />
        <Tabs.Screen name="ground/[id]/slots" options={HIDDEN_TAB} />
        <Tabs.Screen name="booking/summary" options={HIDDEN_TAB} />
        <Tabs.Screen name="booking/[id]/confirmed" options={HIDDEN_TAB} />
        <Tabs.Screen name="booking/[id]/pay" options={HIDDEN_TAB} />
        <Tabs.Screen name="booking/[id]/qr" options={HIDDEN_TAB} />
        <Tabs.Screen name="booking/[id]/review" options={HIDDEN_TAB} />
      </Tabs>
    </RoleGuard>
  );
}
