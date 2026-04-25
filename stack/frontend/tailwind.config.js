/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-orange": "#E85D04",
        "brand-orange-2": "#FF6B1A",
        neutral: {
          50:  "#F7F6F3",
          100: "#EEEDE9",
          200: "#DDDBD5",
          300: "#C8C6BF",
          400: "#9B9890",
          500: "#737068",
          600: "#5C5A55",
          700: "#3D3B37",
          800: "#2A2926",
          900: "#1A1917",
          950: "#0A0A0A",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Syne", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "card-md": "0 4px 16px rgba(0,0,0,0.06)",
        "card-lg": "0 12px 40px rgba(0,0,0,0.10)",
        "orange":  "0 8px 32px rgba(232,93,4,0.25)",
        "orange-lg": "0 16px 48px rgba(232,93,4,0.35)",
      },
      backgroundImage: {
        "gradient-orange": "linear-gradient(135deg, #E85D04 0%, #FF6B1A 100%)",
        "gradient-dark":   "linear-gradient(135deg, #1A1917 0%, #0A0A0A 100%)",
      },
    },
  },
  plugins: [],
};
