import React, { useEffect, useRef } from "react";
import { View, ViewProps, Animated } from "react-native";

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
          backgroundColor: "#E2EAE5",
          opacity,
        },
        style,
      ]}
    />
  );
}

export function GroundCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
      <Skeleton height={140} borderRadius={12} />
      <View className="mt-3 gap-2">
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={14} />
        <View className="flex-row justify-between mt-1">
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} />
        </View>
      </View>
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
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
