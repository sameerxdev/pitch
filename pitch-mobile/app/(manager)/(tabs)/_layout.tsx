import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useManagerStore } from "@/stores/managerStore";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function ManagerTabsLayout() {
  const activeGround = useManagerStore((s) => s.activeGround);

  if (!activeGround) {
    return <Redirect href="/(manager)/ground-select" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1A5C38",
        tabBarInactiveTintColor: "#A0B4A8",
        tabBarStyle: { borderTopColor: "#E2EAE5", paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="slots"
        options={{
          title: "Slots",
          tabBarIcon: ({ focused }) => <TabIcon icon="🕐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
