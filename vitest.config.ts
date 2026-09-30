import { defineConfig } from "vitest/config";
import path from "path";

// Config aislada de vite.config.ts (que carga PWA/Workbox): las pruebas solo necesitan el alias "@".
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
