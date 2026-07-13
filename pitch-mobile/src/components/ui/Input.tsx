import React, { forwardRef } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, prefix, suffix, ...props },
  ref
) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="text-pitch-text font-medium text-sm mb-1">{label}</Text>
      ) : null}
      <View
        className={[
          "flex-row items-center border rounded-xl bg-white px-4 py-3",
          error ? "border-red" : "border-pitch-border",
        ].join(" ")}
      >
        {prefix ? (
          <Text className="text-pitch-secondary font-medium mr-1">{prefix}</Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#A0B4A8"
          className="flex-1 text-pitch-text font-sans text-base"
          accessibilityLabel={label}
          {...props}
        />
        {suffix}
      </View>
      {error ? (
        <Text className="text-red text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
});
