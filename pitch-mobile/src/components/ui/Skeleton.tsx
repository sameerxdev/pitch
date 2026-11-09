import React, { useEffect, useRef } from "react";
import { View, ViewProps, Animated } from "react-native";
import { colors } from "@/constants/colors";

interface SkeletonProps extends ViewProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({ width, height = 16, borderRadius = 8, style, ...props }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      {...props}
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius,
          backgroundColor: colors.surfaceRaised,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function GroundCardSkeleton() {
  return (
    <View className="bg-pitch-card rounded-3xl mb-4 overflow-hidden" style={{ height: 216, justifyContent: "flex-end", padding: 16 }}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View className="bg-pitch-card rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between mb-3">
        <Skeleton width="50%" height={18} />
        <Skeleton width={70} height={22} borderRadius={11} />
      </View>
      <Skeleton width="40%" height={14} />
      <View className="mt-2 flex-row justify-between">
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={14} />
      </View>
    </View>
  );
}
