import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Bundle the element (renderer included) into one self-contained IIFE the worker
// serves at /embed/ht-player-avatar.js. Resolve the renderer from source so no
// prebuilt dist is required.
const rendererSrc = fileURLToPath(
  new URL("../hattrick-player-renderer/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: { alias: { "hattrick-player-renderer": rendererSrc } },
  build: {
    outDir: fileURLToPath(new URL("../../apps/hattrick-worker/public/embed", import.meta.url)),
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("src/index.ts", import.meta.url)),
      formats: ["iife"],
      name: "HtPlayerAvatar",
      fileName: () => "ht-player-avatar.js",
    },
  },
});
