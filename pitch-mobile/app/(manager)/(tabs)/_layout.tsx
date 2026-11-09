import React from "react";
import { TabIcon, useTabScreenOptions } from "@/components/ui/tabs";
import { Redirect, Tabs } from "expo-router";

import { useManagerStore } from "@/stores/managerStore";

export default function ManagerTabsLayout() {
  const tabScreenOptions = useTabScreenOptions();
  const activeGround = useManagerStore((s) => s.activeGround);

  if (!activeGround) {
    return <Redirect href="/(manager)/ground-select" />;
  }

  return (
    <Tabs
      screenOptions={tabScreenOptions}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon icon="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => <TabIcon icon="bookings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="slots"
        options={{
          title: "Slots",
          tabBarIcon: ({ focused }) => <TabIcon icon="clock" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ focused }) => <TabIcon icon="star" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => <TabIcon icon="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
