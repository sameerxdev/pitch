import React, { useEffect, useRef } from "react";
import { View, Text, Dimensions, Animated } from "react-native";

const { width } = Dimensions.get("window");
const FRAME_SIZE = width * 0.65;

export function ScannerOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View className="absolute inset-0 items-center justify-center">
      <View className="absolute inset-0 bg-black opacity-60" />

      <View
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          position: "relative",
        }}
      >
        {[
          { top: 0, left: 0 },
          { top: 0, right: 0 },
          { bottom: 0, left: 0 },
          { bottom: 0, right: 0 },
        ].map((pos, idx) => (
          <Animated.View
            key={idx}
            style={[
              pos,
              { opacity },
              {
                position: "absolute",
                width: 28,
                height: 28,
                borderColor: "#FFFFFF",
                borderTopWidth: idx < 2 ? 3 : 0,
                borderBottomWidth: idx >= 2 ? 3 : 0,
                borderLeftWidth: idx === 0 || idx === 2 ? 3 : 0,
                borderRightWidth: idx === 1 || idx === 3 ? 3 : 0,
                borderTopLeftRadius: idx === 0 ? 4 : 0,
                borderTopRightRadius: idx === 1 ? 4 : 0,
                borderBottomLeftRadius: idx === 2 ? 4 : 0,
                borderBottomRightRadius: idx === 3 ? 4 : 0,
              },
            ]}
          />
        ))}
      </View>

      <Text className="text-white text-center mt-6 px-8 text-sm opacity-80">
        Scan player QR code
      </Text>
    </View>
  );
}
