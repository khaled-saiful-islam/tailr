import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// In `make dev`, /api goes to the backend container; in production nginx does this.
const apiTarget = process.env.VITE_API_TARGET ?? "http://localhost:8401";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: Number(process.env.DEV_PORT ?? 8403),
    strictPort: true,
    // The backend container fetches public.html from here to serve /p/<slug> in development.
    allowedHosts: ["host.docker.internal"],
    proxy: {
      "/api": { target: apiTarget, changeOrigin: false },
      // Public pages are served by the backend (it writes their link-preview tags):
      // /cv/<slug> (online CV) and /p/<slug>/... (portfolio site).
      "^/cv/[^/]+/?$": { target: apiTarget, changeOrigin: false },
      "^/p/[^/]+(/.*)?$": { target: apiTarget, changeOrigin: false },
    },
  },
  build: {
    sourcemap: "hidden",
    target: "es2022",
    // Two pages: the app, and the light public profile page (/p/<slug>).
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("./index.html", import.meta.url)),
        public: fileURLToPath(new URL("./public.html", import.meta.url)),
      },
    },
  },
});
