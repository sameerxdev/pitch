import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green",
  error: "bg-red",
  info: "bg-pitch-text",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function Toast({ message, type = "info", duration = 3000, onDismiss }: ToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }).start();

    if (onDismiss) {
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) onDismiss();
          }
        );
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [translateY, duration, onDismiss]);

  return (
    <Animated.View
      style={[
        { transform: [{ translateY }] },
        { position: "absolute", top: 0, left: 16, right: 16, zIndex: 9999 },
      ]}
    >
      <View className={`flex-row items-center rounded-xl px-4 py-3 gap-3 ${typeStyles[type]}`}>
        <Text className="text-white font-bold">{typeIcons[type]}</Text>
        <Text className="text-white font-medium flex-1">{message}</Text>
      </View>
    </Animated.View>
  );
}
