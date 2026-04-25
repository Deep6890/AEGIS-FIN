/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-orange":    "#E8572A",
        "brand-orange-2":  "#F06A3A",
        neutral: {
          50:  "#F5F5F5",
          100: "#EBEBEB",
          200: "#D6D6D6",
          300: "#ABABAB",
          400: "#888888",
          500: "#6B6B6B",
          600: "#525252",
          700: "#3D3D3D",
          800: "#2A2A2A",
          900: "#1A1A1A",
          950: "#111111",
        },
      },
      fontFamily: {
        sans:    ["DM Sans", "system-ui", "-apple-system", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
        mono:    ["DM Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "18px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03)",
        "card-md": "0 4px 16px rgba(0,0,0,.07)",
        "card-lg": "0 12px 40px rgba(0,0,0,.12)",
        "orange":  "0 8px 28px rgba(232,87,42,.28)",
        "glow":    "0 0 0 3px rgba(232,87,42,.12)",
      },
    },
  },
  plugins: [],
};
