/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-orange":    "#FF4D00",
        "brand-orange-lt": "#FF6B2B",
        neutral: {
          50:  "#F5F4F0",
          100: "#EEECEA",
          200: "#E0DED9",
          300: "#C8C6C0",
          400: "#A09E9A",
          500: "#6B6A67",
          600: "#4A4946",
          700: "#333230",
          800: "#1F1F1D",
          900: "#111110",
          950: "#0C0C0B",
        },
      },
      fontFamily: {
        sans:    ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        display: ["Cabinet Grotesk", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono:    ["Geist Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "12px",
        "3xl": "16px",
        "4xl": "20px",
        "5xl": "24px",
      },
      boxShadow: {
        "card":    "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)",
        "card-md": "0 4px 16px rgba(0,0,0,0.07)",
        "card-lg": "0 12px 40px rgba(0,0,0,0.12)",
        "orange":  "0 8px 28px rgba(255,77,0,0.25)",
        "orange-lg": "0 16px 48px rgba(255,77,0,0.32)",
        "glow":    "0 0 0 3px rgba(255,77,0,0.1)",
      },
      backgroundImage: {
        "gradient-orange": "linear-gradient(135deg, #FF4D00 0%, #FF6B2B 100%)",
        "gradient-warm":   "linear-gradient(135deg, #1A1A18 0%, #0C0C0B 100%)",
        "gradient-surface":"linear-gradient(180deg, #FFFFFF 0%, #F5F4F0 100%)",
      },
      animation: {
        "spin": "spin 1s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease both",
        "slide-up": "slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "ping": "ping 1s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};
