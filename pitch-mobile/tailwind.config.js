const { palette: p } = require("./src/constants/palette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: p.brand, soft: p.brandSoft, border: p.brandBorder },
        green: {
          DEFAULT: p.primary,
          light: p.brand,
          pale: p.brandSoft,
          border: p.brandBorder,
          dark: p.primaryPressed,
        },
        amber: {
          DEFAULT: p.amber,
          pale: p.amberSoft,
          border: p.amberBorder,
          dark: p.amberLight,
        },
        accent: {
          DEFAULT: p.accent,
          pressed: p.accentPressed,
          on: p.onAccent,
        },
        red: { DEFAULT: p.dangerFill, soft: p.danger, pale: p.dangerSoft, border: p.dangerBorder },
        info: { DEFAULT: p.info, soft: p.infoSoft },
        pitch: {
          bg: p.bg,
          card: p.surface,
          raised: p.surfaceRaised,
          border: p.border,
          text: p.text,
          secondary: p.textSecondary,
          muted: p.textMuted,
        },
      },
    },
  },
  plugins: [],
};
