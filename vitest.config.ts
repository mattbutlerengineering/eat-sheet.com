import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@server": "./src/server",
      "@client": "./src/client",
    },
  },
});
