import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@server": resolve(__dirname, "src/server"),
      "@client": resolve(__dirname, "src/client"),
      "@shared": resolve(__dirname, "src/shared"),
      // Rialto was published with incorrect exports map (src/ instead of dist/).
      // Alias the styles import directly to the compiled CSS file.
      "@mattbutlerengineering/rialto/styles": resolve(
        __dirname,
        "node_modules/@mattbutlerengineering/rialto/dist/lib/styles.css",
      ),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/client",
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
});
