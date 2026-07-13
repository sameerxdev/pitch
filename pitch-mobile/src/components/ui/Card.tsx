import React from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
  shadow?: boolean;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({ children, padding = "md", shadow = true, className = "", ...props }: CardProps) {
  return (
    <View
      {...props}
      className={[
        "bg-white rounded-2xl",
        paddingMap[padding],
        shadow ? "shadow-sm" : "",
        className,
      ].join(" ")}
    >
      {children}
    </View>
  );
}
