import type { Config } from "tailwindcss";

// Fatty Chem brand palette
// Sampled from logo: warm amber/orange on near-black background.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FEF5E7",
          100: "#FDE7C3",
          200: "#FAD08C",
          300: "#F6B654",
          400: "#F1A02A",
          DEFAULT: "#ED9221", // Primary brand orange
          500: "#ED9221",
          600: "#C77818",
          700: "#9F5F13",
          800: "#7A4810",
          900: "#52310B",
          // Legacy aliases used by existing components
          light: "#F1A02A",
          dark: "#C77818",
        },
        ink: {
          // Near-black used as supporting brand surface (matches logo background)
          DEFAULT: "#0A0A0A",
          50: "#F6F6F6",
          100: "#E7E7E7",
          200: "#C9C9C9",
          300: "#A1A1A1",
          400: "#727272",
          500: "#4A4A4A",
          600: "#2E2E2E",
          700: "#1C1C1C",
          800: "#121212",
          900: "#0A0A0A",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
