import React, { useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { hapticTap } from "@/utils/haptics";

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Scale applied while pressed. */
  pressedScale?: number;
};

/** A press target that shrinks slightly under the finger and ticks on release. */
export function PressableScale({ style, children, pressedScale = 0.97, onPress, ...props }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Pressable
      {...props}
      onPress={(e) => {
        hapticTap();
        onPress?.(e);
      }}
      onPressIn={() => spring(pressedScale)}
      onPressOut={() => spring(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
