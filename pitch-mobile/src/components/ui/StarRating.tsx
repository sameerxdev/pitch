import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";
import { hapticTap } from "@/utils/haptics";

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizeMap = { sm: 14, md: 22, lg: 34 };

export function StarRating({ value, onChange, size = "md", readonly = false }: StarRatingProps) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => {
            hapticTap();
            onChange?.(star);
          }}
          disabled={readonly || !onChange}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          className="mr-0.5"
        >
          <Icon
            name={star <= value ? "star" : "starOutline"}
            size={sizeMap[size]}
            color={star <= value ? colors.amber : colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function RatingDisplay({ value, count }: { value: number; count?: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Icon name="star" size={13} color={colors.amber} />
      <Text className="text-pitch-text font-bold text-sm">{value.toFixed(1)}</Text>
      {count !== undefined && (
        <Text className="text-pitch-secondary text-xs">({count})</Text>
      )}
    </View>
  );
}
