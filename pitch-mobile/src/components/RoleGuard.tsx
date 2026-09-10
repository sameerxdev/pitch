/**
 * Keeps a route group to its own role.
 *
 * The root `AuthGate` only redirects on first landing, so without this a stale
 * deep link or a role change mid-session could leave someone inside another
 * role's screens — where every API call would 403 anyway, but with confusing UI.
 */
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/api/types";

const HOME_FOR_ROLE: Record<UserRole, string> = {
  player: "/(player)",
  manager: "/(manager)/ground-select",
  ground_owner: "/(owner)/(tabs)",
  admin: "/(admin)",
};

export function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const allowed = user?.role === role;

  useEffect(() => {
    if (isLoading || allowed) return;
    router.replace((user ? HOME_FOR_ROLE[user.role] : "/(auth)") as never);
  }, [isLoading, allowed, user, router]);

  if (!allowed) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F3F5F2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#1A5C38" />
      </View>
    );
  }

  return <>{children}</>;
}
