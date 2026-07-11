import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          950: "#0A1420", // deepest panel / sidebar
          900: "#0F1D2E",
          800: "#16293D",
          700: "#1F3A52",
          600: "#33597A",
          400: "#7C97AC",
          200: "#C7D4DD",
          100: "#E8EDF0",
        },
        ledger: {
          paper: "#F6F4EE", // warm paper background for content
          line: "#E2DCC9",
        },
        signal: {
          teal: "#1FAE9A",
          tealDark: "#138577",
          amber: "#C8801A",
          rose: "#B5453F",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace"],
      },
      boxShadow: {
        drawer: "8px 0 30px -10px rgba(10, 20, 32, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
