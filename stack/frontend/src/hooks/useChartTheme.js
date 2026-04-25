import { useTheme } from "../context/ThemeContext";

export function useChartTheme() {
  const { dark } = useTheme();
  return {
    orange:  "#FF8A00",
    yellow:  "#FFC224",
    green:   "#00B341",
    blue:    "#007AFF",
    red:     "#FF3B30",
    purple:  "#8B5CF6",
    emerald: "#00B341",
    grid:    dark ? "#262626" : "#F3F3F3",
    tick:    dark ? "#525252" : "#A3A3A3",
    tooltip: {
      contentStyle: {
        background: dark ? "#171717" : "#fff",
        border:     `1px solid ${dark ? "#262626" : "#E8E8E8"}`,
        borderRadius: 12,
        fontSize: 11,
        color: dark ? "#F3F3F3" : "#171717",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        padding: "8px 12px",
      },
      cursor: { fill: "rgba(232,93,4,0.04)" },
    },
  };
}
