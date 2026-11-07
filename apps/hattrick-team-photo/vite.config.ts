import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const vendorDir = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/vendor", import.meta.url),
);
const src = (pkg: string): string =>
  fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

// Pure frontend. The roster (CHPP) and the Cloudflare-clearing player-page
// scrape live in the deployable `hattrick-backend` service. In dev we proxy
// /api to it; in production the static build calls VITE_API_BASE.
const BACKEND = process.env.BACKEND_ORIGIN ?? "http://localhost:8787";

// Served under hattrick-tools.org/team-photo, built into the worker's combined
// asset root so one Worker serves it next to player-renderer.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/team-photo/",
  publicDir: vendorDir,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../hattrick-worker/public/team-photo", import.meta.url)),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "hattrick-player-renderer": src("hattrick-player-renderer"),
      "hattrick-player-renderer-react": src("hattrick-player-renderer-react"),
      "hattrick-ui": src("hattrick-ui"),
    },
  },
  server: {
    fs: { allow: [repoRoot] },
    proxy: { "/team-photo/api": { target: BACKEND, changeOrigin: true } },
  },
});
