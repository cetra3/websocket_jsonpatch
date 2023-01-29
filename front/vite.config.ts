import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ws": {
        target: "http://127.0.0.1:3333",
        ws: true,
      },
    },
  },
});
