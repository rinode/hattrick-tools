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

export default defineConfig({
  root: here,
  publicDir: vendorDir,
  resolve: { alias: { "hattrick-player-renderer": rendererSrc } },
  server: {
    fs: { allow: [repoRoot] },
  },
});
