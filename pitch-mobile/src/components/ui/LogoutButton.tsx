import React from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

export function LogoutButton({
  onPress,
  loading = false,
  fullWidth = false,
}: {
  onPress: () => void;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Log out"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: fullWidth ? 52 : 36,
        paddingHorizontal: 12,
        borderRadius: fullWidth ? 16 : 999,
        borderWidth: 1.5,
        borderColor: colors.dangerBorder,
        backgroundColor: colors.surface,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.danger} />
      ) : (
        <>
          <Icon name="logout" size={fullWidth ? 18 : 15} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: "700", fontSize: fullWidth ? 15 : 13 }}>
            Log out
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
