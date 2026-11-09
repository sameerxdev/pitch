import React from "react";
import { TabIcon, useTabScreenOptions, HIDDEN_TAB } from "@/components/ui/tabs";
import { Tabs } from "expo-router";


export default function OwnerTabsLayout() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tabs
      screenOptions={tabScreenOptions}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Analytics",
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
        name="reviews"
        options={{
          title: "Reviews",
          tabBarIcon: ({ focused }) => <TabIcon icon="star" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen name="ground/new" options={HIDDEN_TAB} />
      <Tabs.Screen name="ground/[id]/edit" options={HIDDEN_TAB} />
      <Tabs.Screen name="ground/[id]/slots" options={HIDDEN_TAB} />
    </Tabs>
  );
}
