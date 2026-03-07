import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/restaurants/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-restaurants",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^\/api\/photos\//,
            handler: "CacheFirst",
            options: {
              cacheName: "api-photos",
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
      manifest: {
        name: "Eat Sheet",
        short_name: "Eat Sheet",
        description: "Family restaurant rating app",
        theme_color: "#E8836E",
        background_color: "#0c0a09",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/monsters/teal-big-256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
});
