import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    grid:       dark ? "#1f1f1f" : "#f3f4f6",
    axis:       dark ? "#3a3a3a" : "#e5e7eb",
    tick:       dark ? "#555"    : "#9ca3af",
    tooltip: {
      contentStyle: {
        background:   dark ? "#111111" : "#ffffff",
        border:       `1px solid ${dark ? "#2a2a2a" : "#f3f4f6"}`,
        borderRadius: 12,
        fontSize:     11,
        color:        dark ? "#e5e7eb" : "#111827",
        boxShadow:    dark ? "0 4px 24px rgba(0,0,0,0.6)" : "0 4px 16px rgba(0,0,0,0.08)",
      },
      cursor: { fill: dark ? "rgba(249,115,22,0.06)" : "rgba(249,115,22,0.04)" },
    },
    orange:  "#f97316",
    emerald: "#10b981",
    red:     "#ef4444",
    amber:   "#f59e0b",
    blue:    "#6366f1",
    purple:  "#8b5cf6",
    cyan:    "#06b6d4",
    COLORS:  ["#f97316","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16","#ec4899","#14b8a6"],
  };
}
