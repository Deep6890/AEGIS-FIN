import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    orange:  "#E8A020",
    yellow:  "#E8C547",
    green:   "#52B788",
    "green-d": "#2D6A4F",
    blue:    "#60A5FA",
    red:     "#F87171",
    purple:  "#A78BFA",
    grid:    dark ? "#1F2128" : "#F0EDE6",
    tick:    dark ? "#4B5563" : "#9CA3AF",
    tooltip: {
      contentStyle: {
        background: dark ? "#1A1C23" : "#fff",
        border:     `1px solid ${dark ? "#1F2128" : "#E5E1D8"}`,
        borderRadius: 12,
        fontSize: 11,
        color: dark ? "#E8E6E0" : "#0D0D0D",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      },
      cursor: { fill: dark ? "rgba(232,197,71,0.05)" : "rgba(232,197,71,0.08)" },
    },
    emerald: "#52B788",
  };
}
