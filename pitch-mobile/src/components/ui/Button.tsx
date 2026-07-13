import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from "react-native";

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

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-green active:bg-green-dark",
    text: "text-white font-bold",
  },
  secondary: {
    container: "bg-green-pale border border-green-border active:bg-green-border",
    text: "text-green font-bold",
  },
  ghost: {
    container: "bg-transparent active:bg-pitch-bg",
    text: "text-green font-medium",
  },
  danger: {
    container: "bg-red active:opacity-80",
    text: "text-white font-bold",
  },
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: "px-4 py-2 rounded-lg", text: "text-sm" },
  md: { container: "px-5 py-3 rounded-xl", text: "text-base" },
  lg: { container: "px-6 py-4 rounded-xl", text: "text-base" },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  disabled,
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
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#1A5C38"}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={[vStyle.text, sStyle.text].join(" ")}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
