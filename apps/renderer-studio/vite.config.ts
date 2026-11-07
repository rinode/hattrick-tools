import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
// Serve the renderer's vendored Hattrick assets at the site root, so the
// engine and body assets resolve same-origin (fully standalone).
const vendorDir = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/vendor", import.meta.url),
);
// Resolve the workspace packages from their TS/TSX source, so editing a package
// doesn't require rebuilding it and CSS Modules compile in the app build.
const src = (pkg: string): string =>
  fileURLToPath(new URL(`../../packages/${pkg}/src/index.ts`, import.meta.url));

// Served under hattrick-tools.org/player-renderer, built into the worker's
// combined asset root alongside team-photo.
export default defineConfig({
  root: here,
  base: "/player-renderer/",
  publicDir: vendorDir,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("../hattrick-worker/public/player-renderer", import.meta.url)),
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
  },
});
