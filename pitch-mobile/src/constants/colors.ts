import { palette } from "./palette";

export const colors = palette;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
  /** Scoreboard numerals: prices, times, scores. */
  display: "BarlowCondensed_700Bold",
} as const;

/** Status colors for slot cells and their legend. */
export const Colors = {
  slot: {
    available: { bg: palette.surface, text: palette.text, border: palette.border },
    on_hold: { bg: palette.amberSoft, text: palette.amberLight, border: palette.amberBorder },
    booked: { bg: palette.dangerSoft, text: palette.danger, border: palette.dangerBorder },
    selected: { bg: palette.accent, text: palette.onAccent, border: palette.accent },
    blocked: { bg: palette.surface, text: palette.textMuted, border: palette.border },
  },
} as const;
