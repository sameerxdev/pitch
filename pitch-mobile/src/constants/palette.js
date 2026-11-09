/** Single source of truth for app colors. Tailwind and TypeScript both read this. */
const palette = {
  bg: "#06140D",
  hero: "#0C2C1C",
  surface: "#10261B",
  surfaceRaised: "#1A3627",
  border: "#27463A",
  borderStrong: "#3C6350",

  text: "#F4F8F3",
  textSecondary: "#ABC1B2",
  textMuted: "#7C9688",

  primary: "#1B7F4D",
  primaryPressed: "#14663D",
  brand: "#6FE3A2",
  brandSoft: "rgba(111,227,162,0.14)",
  brandBorder: "rgba(111,227,162,0.35)",

  // Main actions, prices, and selected states.
  accent: "#C6F135",
  accentPressed: "#AED320",
  accentLight: "#E0F88F",
  onAccent: "#172000",
  accentSoft: "rgba(198,241,53,0.14)",
  accentBorder: "rgba(198,241,53,0.38)",

  // Warnings, on-hold states, and star ratings.
  amber: "#FFC247",
  amberLight: "#FFD98A",
  amberSoft: "rgba(255,194,71,0.14)",
  amberBorder: "rgba(255,194,71,0.38)",

  danger: "#FF8A7A",
  dangerFill: "#D5433A",
  dangerSoft: "rgba(255,138,122,0.14)",
  dangerBorder: "rgba(255,138,122,0.38)",

  info: "#8CC4FF",
  infoSoft: "rgba(140,196,255,0.14)",

  white: "#FFFFFF",
  black: "#000000",
  paper: "#FBF8EF",
  ink: "#10201A",
  inkSecondary: "#5C6F64",
};

module.exports = { palette };
