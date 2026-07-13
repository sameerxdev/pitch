export const Colors = {
  green: {
    DEFAULT: "#1A5C38",
    light: "#2E8B57",
    pale: "#E8F3EE",
    border: "#C5DFD1",
    dark: "#0F3D25",
  },
  amber: {
    DEFAULT: "#F5A623",
    pale: "#FEF3DC",
    border: "#F0C56A",
    dark: "#9B6008",
  },
  red: {
    DEFAULT: "#E34C3C",
    pale: "#FDECEA",
    border: "#EFBBBB",
  },
  text: {
    primary: "#0D1F15",
    secondary: "#5A7264",
    muted: "#A0B4A8",
  },
  bg: {
    page: "#F3F5F2",
    card: "#FFFFFF",
    border: "#E2EAE5",
  },
  slot: {
    available: { bg: "#E8F3EE", text: "#1A5C38", border: "#C5DFD1" },
    on_hold: { bg: "#FEF3DC", text: "#9B6008", border: "#F0C56A" },
    booked: { bg: "#FDECEA", text: "#E34C3C", border: "#EFBBBB" },
    selected: { bg: "#1A5C38", text: "#FFFFFF", border: "#1A5C38" },
    blocked: { bg: "#F3F5F2", text: "#A0B4A8", border: "#E2EAE5" },
  },
} as const;
