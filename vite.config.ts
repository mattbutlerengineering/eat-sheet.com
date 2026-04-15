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
      // Rialto published exports point to src/ which doesn't exist in the tarball.
      // Alias all entry points to the compiled dist/lib/ files.
      "@mattbutlerengineering/rialto/styles": resolve(
        __dirname,
        "node_modules/@mattbutlerengineering/rialto/dist/lib/styles.css",
      ),
      "@mattbutlerengineering/rialto/motion": resolve(
        __dirname,
        "node_modules/@mattbutlerengineering/rialto/dist/lib/motion.js",
      ),
      "@mattbutlerengineering/rialto": resolve(
        __dirname,
        "node_modules/@mattbutlerengineering/rialto/dist/lib/rialto.js",
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
