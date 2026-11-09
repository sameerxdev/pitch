import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colors, fonts } from "@/constants/colors";

export function TabIcon({ icon, focused }: { icon: IconName; focused: boolean }) {
  return (
    <View
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.accentSoft : "transparent",
      }}
    >
      <Icon
        name={icon}
        size={19}
        color={focused ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

/** Shared tab bar styling, sized around the device's home indicator. */
export function useTabScreenOptions() {
  const { bottom } = useSafeAreaInsets();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colors.bg },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 64 + bottom,
      paddingTop: 6,
      paddingBottom: bottom + 6,
    },
    tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontFamily: fonts.semibold },
  } as const;
}

// SDK 58 redirects away from `href: null` tabs, so hidden screens stay routable
// and only their tab buttons are hidden.
export const HIDDEN_TAB = { tabBarItemStyle: { display: "none" } } as const;
