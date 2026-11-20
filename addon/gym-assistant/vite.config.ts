import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === "serve"
      ? [
          devtools({
            logging: false,
            eventBusConfig: { enabled: false },
            enhancedLogs: { enabled: false },
            consolePiping: { enabled: false },
            removeDevtoolsOnBuild: false,
            injectSource: { enabled: true },
          }),
        ]
      : []),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? [
          nitro({
            preset: "node-server",
            inlineDynamicImports: true,
            rolldownConfig: {
              output: {
                codeSplitting: false,
                inlineDynamicImports: true,
              },
            },
          }),
        ]
      : []),
    react(),
    VitePWA({
      strategies: "generateSW",
      outDir: ".output/public",
      injectRegister: null,
      registerType: "autoUpdate",
      filename: "sw.js",
      devOptions: { enabled: false },
      manifest: {
        name: "SET – Träningslogg",
        short_name: "SET",
        description: "Din lokala träningslogg",
        lang: "sv",
        theme_color: "#171b18",
        background_color: "#171b18",
        display: "standalone",
        start_url: "/",
        scope: "/",
        id: "/",
        icons: [
          { src: "/icons/set-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/set-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/set-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      includeAssets: ["icons/*.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,jpg,webmanifest,woff2}"],
        maximumFileSizeToCacheInBytes: 5000000,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "set-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /^\/assets\/.*-[\w-]+\.(js|css|jpg|png|woff2)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "set-assets", expiration: { maxEntries: 100 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    tsconfigPaths: true,
  },
  server: { host: "::", port: 8080 },
}));
