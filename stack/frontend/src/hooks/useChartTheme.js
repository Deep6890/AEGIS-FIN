import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    yellow:  "#EAB308",
    green:   "#22C55E",
    amber:   "#F59E0B",
    red:     "#EF4444",
    blue:    "#60A5FA",
    purple:  "#A78BFA",
    orange:  "#F97316",
    grid:    dark ? "#262626" : "#F5F5F4",
    tick:    dark ? "#525252" : "#A8A29E",
    tooltip: {
      contentStyle: {
        background: dark ? "#1C1917" : "#FFFFFF",
        border:     `1px solid ${dark ? "#292524" : "#E7E5E4"}`,
        borderRadius: 8,
        fontSize: 11,
        color: dark ? "#F5F5F4" : "#1C1917",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        padding: "8px 12px",
      },
      cursor: { fill: dark ? "rgba(234,179,8,0.05)" : "rgba(234,179,8,0.08)" },
    },
    emerald: "#22C55E",
    orange_stroke: "#F97316",
  };
}
