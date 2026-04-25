/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-orange": "#E85D04",
        neutral: {
          50:  "#F7F7F5",
          100: "#EFEFED",
          200: "#E4E4E2",
          300: "#D0D0CE",
          400: "#A8A8A6",
          500: "#737371",
          600: "#525250",
          700: "#3D3D3B",
          800: "#282826",
          900: "#1A1A18",
          950: "#0C0C0C",
        },
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tight: "-0.02em",
        tighter: "-0.03em",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "card":    "0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.04)",
        "card-md": "0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        "card-lg": "0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        "glow-orange": "0 0 0 3px rgba(232,93,4,0.15)",
      },
    },
  },
  plugins: [],
};
