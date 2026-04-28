import { defineConfig, mergeConfig } from "vitest/config";
import { resolve } from "path";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "node",
      include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx"],
      environmentMatchGlobs: [
        ["src/client/**/__tests__/**/*.test.tsx", "jsdom"],
      ],
      setupFiles: ["./src/test-setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        thresholds: {
          lines: 70,
          branches: 60,
          functions: 70,
          statements: 70,
        },
      },
    },
    resolve: {
      alias: {
        "@server": resolve(__dirname, "src/server"),
        "@client": resolve(__dirname, "src/client"),
        "@shared": resolve(__dirname, "src/shared"),
      },
    },
  }),
);
