import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function PlayerLayout() {
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
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ focused }) => <TabIcon icon="🏟️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => <TabIcon icon="🔎" focused={focused} />,
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
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />

      {/* ── Hidden routes (no tab icon) ── */}
      <Tabs.Screen name="ground/[id]" options={{ href: null }} />
      <Tabs.Screen name="ground/[id]/slots" options={{ href: null }} />
      <Tabs.Screen name="booking/summary" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/confirmed" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/qr" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/review" options={{ href: null }} />
    </Tabs>
  );
}
