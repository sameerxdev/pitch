import React from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { colors } from "@/constants/colors";

const ION = {
  location: "location-sharp",
  star: "star",
  starOutline: "star-outline",
  search: "search",
  close: "close",
  back: "arrow-back",
  forward: "arrow-forward",
  check: "checkmark",
  checkCircle: "checkmark-circle",
  errorCircle: "close-circle",
  camera: "camera-outline",
  card: "card-outline",
  cash: "cash-outline",
  bank: "business-outline",
  lock: "lock-closed",
  home: "home",
  explore: "compass",
  bookings: "calendar",
  clipboard: "clipboard-outline",
  profile: "person",
  analytics: "stats-chart",
  users: "people",
  shield: "shield-checkmark",
  clock: "time",
  reply: "arrow-undo",
  swap: "swap-horizontal",
  sun: "sunny",
  moon: "moon",
  chevronLeft: "chevron-back",
  chevronRight: "chevron-forward",
  info: "information-circle",
  cafe: "cafe",
  ticket: "ticket",
  qr: "qr-code",
  logout: "log-out-outline",
  phone: "call",
  calendar: "calendar-outline",
  images: "images-outline",
} as const;

const MCI = {
  cricket: "cricket",
  stadium: "stadium-variant",
  shower: "shower",
  floodlight: "spotlight-beam",
  parking: "parking",
} as const;

export type IconName = keyof typeof ION | keyof typeof MCI;

interface IconProps {
  name: IconName;
  size?: number;
  /** Left out, the icon takes the color of the Text it sits inside. */
  color?: string;
}

export function Icon({ name, size = 16, color }: IconProps) {
  if (name in MCI) {
    return (
      <MaterialCommunityIcons
        name={MCI[name as keyof typeof MCI]}
        size={size}
        color={color}
      />
    );
  }
  return (
    <Ionicons
      name={ION[name as keyof typeof ION]}
      size={size}
      color={color}
    />
  );
}

/** A tinted circle holding an icon, used for empty states and avatars. */
export function IconBadge({
  name,
  size = 36,
  color = colors.brand,
  background = colors.brandSoft,
}: {
  name: IconName;
  size?: number;
  color?: string;
  background?: string;
}) {
  const box = size * 2;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={size} color={color} />
    </View>
  );
}
