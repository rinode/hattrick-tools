import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
// Serve the renderer's vendored Hattrick assets at the site root, so the
// engine and body assets resolve same-origin (fully standalone).
const vendorDir = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/vendor", import.meta.url),
);

export default defineConfig({
  root: here,
  publicDir: vendorDir,
  server: {
    fs: { allow: [repoRoot] },
  },
});
