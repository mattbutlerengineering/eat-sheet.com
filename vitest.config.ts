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
