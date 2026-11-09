import React from "react";
import { TabIcon, useTabScreenOptions } from "@/components/ui/tabs";
import { Tabs } from "expo-router";


export default function AdminTabsLayout() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tabs
      screenOptions={tabScreenOptions}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ focused }) => <TabIcon icon="analytics" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="grounds"
        options={{
          title: "Grounds",
          tabBarIcon: ({ focused }) => <TabIcon icon="stadium" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ focused }) => <TabIcon icon="users" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <TabIcon icon="shield" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
