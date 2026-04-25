import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    orange:  "#FF4D00",
    yellow:  "#F5C842",
    green:   "#16A34A",
    blue:    "#2563EB",
    red:     "#DC2626",
    purple:  "#7C3AED",
    emerald: "#059669",
    cyan:    "#0891B2",
    grid:    dark ? "#1F1F1D" : "#EEECEA",
    tick:    dark ? "#4A4946" : "#A09E9A",
    tooltip: {
      contentStyle: {
        background:   dark ? "#1A1A18" : "#FFFFFF",
        border:       `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 10,
        fontSize:     11,
        fontFamily:   "'Plus Jakarta Sans', system-ui, sans-serif",
        color:        dark ? "#F0EFE9" : "#111110",
        boxShadow:    dark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.08)",
        padding:      "8px 12px",
      },
      cursor: { fill: "rgba(255,77,0,0.04)" },
    },
    COLORS: ["#FF4D00","#2563EB","#16A34A","#F5C842","#DC2626","#7C3AED","#0891B2","#84CC16","#EC4899","#14B8A6"],
  };
}
