/**
 * App-wide Text and TextInput. React Native picks custom font files by family,
 * not by fontWeight, so a weight is translated into the matching Plus Jakarta
 * Sans family here. Screens keep writing fontWeight or font-bold as usual.
 */
import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { colors, fonts } from "@/constants/colors";

const FONT_CLASS = /\bfont-(sans|medium|semibold|bold|extrabold|black)\b/g;
const COLOR_CLASS = /\btext-(pitch|green|brand|accent|amber|red|info|white|black)\b/;

function familyForWeight(weight: TextStyle["fontWeight"] | undefined, className: string) {
  const fromClass = className.match(/\bfont-(medium|semibold|bold|extrabold|black)\b/)?.[1];
  switch (String(weight ?? fromClass ?? "")) {
    case "500":
    case "medium":
      return fonts.medium;
    case "600":
    case "semibold":
      return fonts.semibold;
    case "700":
    case "bold":
      return fonts.bold;
    case "800":
    case "900":
    case "extrabold":
    case "black":
      return fonts.extrabold;
    default:
      return fonts.regular;
  }
}

type Styled = { style?: TextProps["style"]; className?: string };

function resolve({ style, className = "" }: Styled) {
  const { fontWeight, ...rest } = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const base: { fontFamily?: string; color?: TextStyle["color"] } = {};
  if (!rest.fontFamily) base.fontFamily = familyForWeight(fontWeight, className);
  if (!rest.color && !COLOR_CLASS.test(className)) base.color = colors.text;
  return {
    style: [base, rest],
    className: className.replace(FONT_CLASS, "").trim() || undefined,
  };
}

export function Text({ style, className, ...props }: TextProps & { className?: string }) {
  return <RNText {...props} {...resolve({ style, className })} />;
}

export const TextInput = forwardRef<
  TextInputInstance,
  TextInputProps & { className?: string }
>(function TextInput({ style, className, ...props }, ref) {
  return (
    <RNTextInput
      ref={ref}
      keyboardAppearance="dark"
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.accent}
      {...props}
      {...resolve({ style: style as TextProps["style"], className })}
    />
  );
});
