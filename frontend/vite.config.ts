import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      react: resolve(rootDir, "node_modules/preact/compat"),
      "react-dom": resolve(rootDir, "node_modules/preact/compat"),
      "react/jsx-runtime": resolve(rootDir, "node_modules/preact/jsx-runtime"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/reactShim.cjs", "./src/test/setup.ts"],
    css: true,
    server: {
      deps: {
        inline: [/@mui\/.*/, /@emotion\/.*/, /preact/],
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/ws": {
        target: "http://127.0.0.1:8010",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
