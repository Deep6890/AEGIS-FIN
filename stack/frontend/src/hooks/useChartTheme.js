import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    orange:  "#E8572A",
    yellow:  "#F5C842",
    green:   "#22C55E",
    blue:    "#3B82F6",
    red:     "#EF4444",
    purple:  "#8B5CF6",
    emerald: "#10B981",
    cyan:    "#06B6D4",
    grid:    dark ? "#2A2A2A" : "#F0F0F0",
    tick:    dark ? "#555555" : "#ABABAB",
    tooltip: {
      contentStyle: {
        background:   dark ? "#1C1C1C" : "#FFFFFF",
        border:       `1px solid ${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.07)"}`,
        borderRadius: 14,
        fontSize:     11,
        fontFamily:   "'DM Sans', system-ui, sans-serif",
        color:        dark ? "#F2F2F2" : "#111111",
        boxShadow:    dark ? "0 4px 20px rgba(0,0,0,.5)" : "0 4px 16px rgba(0,0,0,.08)",
        padding:      "8px 12px",
      },
      cursor: { fill: "rgba(232,87,42,.04)" },
    },
    COLORS: ["#E8572A","#3B82F6","#22C55E","#F5C842","#EF4444","#8B5CF6","#06B6D4","#84CC16","#EC4899","#14B8A6"],
  };
}
