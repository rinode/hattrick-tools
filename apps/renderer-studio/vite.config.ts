import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
// Serve the renderer's vendored Hattrick assets at the site root, so the
// engine and body assets resolve same-origin (fully standalone).
const vendorDir = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/vendor", import.meta.url),
);
// Resolve the renderer from its TS source in dev, so tweaking the package
// doesn't require rebuilding it before `dev` picks the change up.
const rendererSrc = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/src/index.ts", import.meta.url),
);

// Served under hattrick-tools.org/player-renderer, built into the worker's
// combined asset root alongside team-photo.
export default defineConfig({
  root: here,
  base: "/player-renderer/",
  publicDir: vendorDir,
  build: {
    outDir: fileURLToPath(new URL("../hattrick-worker/public/player-renderer", import.meta.url)),
    emptyOutDir: true,
  },
  resolve: { alias: { "hattrick-player-renderer": rendererSrc } },
  server: {
    fs: { allow: [repoRoot] },
  },
});
