import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function OwnerTabsLayout() {
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
          title: "Analytics",
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="grounds"
        options={{
          title: "Grounds",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏟️" focused={focused} />,
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
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen name="ground/new" options={{ href: null }} />
      <Tabs.Screen name="ground/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="ground/[id]/slots" options={{ href: null }} />
    </Tabs>
  );
}
