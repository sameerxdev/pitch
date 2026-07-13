/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
        pitch: {
          bg: "#F3F5F2",
          card: "#FFFFFF",
          border: "#E2EAE5",
          text: "#0D1F15",
          secondary: "#5A7264",
          muted: "#A0B4A8",
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        medium: ["PlusJakartaSans_500Medium"],
        bold: ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
};
