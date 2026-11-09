import React from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { hapticTap } from "@/utils/haptics";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: "bg-accent active:bg-accent-pressed",
    text: "text-accent-on font-extrabold",
    spinner: colors.onAccent,
  },
  secondary: {
    container: "bg-green-pale border border-green-border active:bg-green-border",
    text: "text-brand font-bold",
    spinner: colors.brand,
  },
  ghost: {
    container: "bg-transparent active:bg-pitch-raised",
    text: "text-brand font-medium",
    spinner: colors.brand,
  },
  danger: {
    container: "bg-red active:opacity-80",
    text: "text-white font-bold",
    spinner: colors.white,
  },
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: "px-4 py-2 rounded-xl", text: "text-sm" },
  md: { container: "px-5 py-3 rounded-2xl", text: "text-base" },
  lg: { container: "px-6 py-4 rounded-2xl", text: "text-base" },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      onPress={(e) => {
        hapticTap();
        onPress?.(e);
      }}
      disabled={isDisabled}
      className={[
        "flex-row items-center justify-center",
        vStyle.container,
        sStyle.container,
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50" : "",
      ].join(" ")}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyle.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={[vStyle.text, sStyle.text].join(" ")}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
