import React from "react";
import { View, TouchableOpacity, Text } from "react-native";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizeMap = { sm: "text-sm", md: "text-xl", lg: "text-3xl" };

export function StarRating({ value, onChange, size = "md", readonly = false }: StarRatingProps) {
  const textSize = sizeMap[size];

  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={readonly || !onChange}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          className="mr-0.5"
        >
          <Text className={textSize}>{star <= value ? "★" : "☆"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function RatingDisplay({ value, count }: { value: number; count?: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-amber text-sm">★</Text>
      <Text className="text-pitch-text font-bold text-sm">{value.toFixed(1)}</Text>
      {count !== undefined && (
        <Text className="text-pitch-secondary text-xs">({count})</Text>
      )}
    </View>
  );
}
