import React from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

interface QRDisplayProps {
  value: string;
  size?: number;
}

export function QRDisplay({ value, size = 210 }: QRDisplayProps) {
  return (
    <View
      className="bg-white rounded-2xl items-center justify-center"
      style={{ padding: 16, alignSelf: "center" }}
    >
      <QRCode
        value={value}
        size={size}
        quietZone={12}
        color="#0C1A10"
        backgroundColor="#FFFFFF"
        ecl="M"
      />
    </View>
  );
}
