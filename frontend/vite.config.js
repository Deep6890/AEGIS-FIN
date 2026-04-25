import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the warning threshold — our bundle is intentionally large (recharts + supabase)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split vendor chunks so browsers can cache them independently
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts":   ["recharts"],
          "vendor-icons":    ["lucide-react"],
        },
      },
    },
  },
  // Ensure env vars are available at build time
  envPrefix: "VITE_",
});
