import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "#api": path.resolve(__dirname, "src/api/"),
      "#assets": path.resolve(__dirname, "src/assets/"),
      "#components": path.resolve(__dirname, "src/components/"),
      "#context": path.resolve(__dirname, "src/context/"),
      "#fonts": path.resolve(__dirname, "src/fonts/"),
      "#hooks": path.resolve(__dirname, "src/hooks/"),
      "#layouts": path.resolve(__dirname, "src/layouts/"),
      "#lib": path.resolve(__dirname, "src/lib/"),
      "#pages": path.resolve(__dirname, "src/pages/"),
      "#router": path.resolve(__dirname, "src/router/"),
      "#types": path.resolve(__dirname, "src/types/"),
    },
  },
  plugins: [react(), tailwindcss()],
});
