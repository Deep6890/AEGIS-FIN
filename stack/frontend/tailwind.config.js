/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-orange": "#E85D04",
        "brand-orange-light": "#FF6B1A",
        neutral: {
          50:  "#F9F9F9",
          100: "#F3F3F3",
          200: "#E8E8E8",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0A0A0A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "card": "1rem",
        "2xl":  "1rem",
        "3xl":  "1.5rem",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 16px rgba(0,0,0,0.08)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
