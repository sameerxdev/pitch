export const Routes = {
  // Auth
  AUTH_SPLASH: "/(auth)/",
  AUTH_OTP: "/(auth)/otp",
  AUTH_PROFILE_SETUP: "/(auth)/profile-setup",

  // Player
  PLAYER_HOME: "/(player)/",
  PLAYER_MAP: "/(player)/map",
  PLAYER_BOOKINGS: "/(player)/bookings",
  PLAYER_PROFILE: "/(player)/profile",
  PLAYER_GROUND: (id: string) => `/(player)/ground/${id}` as const,
  PLAYER_SLOTS: (id: string) => `/(player)/ground/${id}/slots` as const,
  PLAYER_BOOKING_SUMMARY: "/(player)/booking/summary",
  PLAYER_BOOKING_PAY: (id: string) => `/(player)/booking/${id}/pay` as const,
  PLAYER_BOOKING_CONFIRMED: (id: string) =>
    `/(player)/booking/${id}/confirmed` as const,
  PLAYER_BOOKING_QR: (id: string) => `/(player)/booking/${id}/qr` as const,
  PLAYER_BOOKING_REVIEW: (id: string) =>
    `/(player)/booking/${id}/review` as const,

  // Manager
  MANAGER_GROUND_SELECT: "/(manager)/ground-select",
  MANAGER_HOME: "/(manager)/(tabs)/",
  MANAGER_BOOKINGS: "/(manager)/(tabs)/bookings",
  MANAGER_SCAN: "/(manager)/scan",
  MANAGER_REVIEWS: "/(manager)/(tabs)/reviews",
  MANAGER_SLOTS: "/(manager)/(tabs)/slots",
  MANAGER_ACCOUNT: "/(manager)/(tabs)/account",
  MANAGER_BOOKING_DETAIL: (id: string) => `/(manager)/booking/${id}` as const,
  MANAGER_BOOKING_COMPLETE: (id: string) =>
    `/(manager)/booking/${id}/complete` as const,

  // Owner
  OWNER_ANALYTICS: "/(owner)/(tabs)",
  OWNER_GROUNDS: "/(owner)/(tabs)/grounds",
  OWNER_REVIEWS: "/(owner)/(tabs)/reviews",
  OWNER_ACCOUNT: "/(owner)/(tabs)/account",
  OWNER_GROUND_NEW: "/(owner)/(tabs)/ground/new",
  OWNER_GROUND_EDIT: (id: string) =>
    `/(owner)/(tabs)/ground/${id}/edit` as const,
  OWNER_GROUND_SLOTS: (id: string) =>
    `/(owner)/(tabs)/ground/${id}/slots` as const,

  // Admin
  ADMIN_HOME: "/(admin)/",
} as const;

export const PAKISTAN_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
] as const;

export type PakistanCity = (typeof PAKISTAN_CITIES)[number];
