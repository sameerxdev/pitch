import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { differenceInSeconds } from "date-fns";
import { formatCountdown } from "@/utils/format";
import { Config } from "@/constants/config";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HoldTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

const SIZE = 120;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HoldTimer({ expiresAt, onExpired }: HoldTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, differenceInSeconds(new Date(expiresAt), new Date())),
  );
  const dashOffset = useRef(new Animated.Value(0)).current;
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const total = Config.HOLD_DURATION_SECONDS;

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.max(
        0,
        differenceInSeconds(new Date(expiresAt), new Date()),
      );
      setRemaining(secs);
      const progress = 1 - secs / total;
      Animated.timing(dashOffset, {
        toValue: CIRCUMFERENCE * progress,
        duration: 900,
        useNativeDriver: false,
      }).start();

      if (secs <= 0) {
        clearInterval(interval);
        onExpiredRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, total, dashOffset]);

  const isUrgent = remaining <= 120;

  return (
    <View className="items-center">
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#E2EAE5"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={isUrgent ? "#E34C3C" : "#F5A623"}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View
        className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        <Text
          className={`font-bold text-lg ${isUrgent ? "text-red" : "text-amber"}`}
        >
          {formatCountdown(remaining)}
        </Text>
        <Text className="text-pitch-secondary text-xs">hold</Text>
      </View>
    </View>
  );
}
