import { builtinModules } from "node:module";
import { defineConfig } from "tsup";

// Node builtins must stay external even though every npm dep is inlined.
// builtinModules omits subpaths (readline/promises, fs/promises, …), so add them.
const subpaths = ["promises", "web", "types", "constants", "sync"];
const builtinExternals = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
  ...builtinModules.flatMap((m) => subpaths.map((s) => `${m}/${s}`)),
  ...builtinModules.flatMap((m) => subpaths.map((s) => `node:${m}/${s}`)),
];

// Self-contained bundle for the MCPB: every dependency inlined so the packed
// extension needs no node_modules. Output lands in build/mcpb/server/.
export default defineConfig({
  entry: { index: "src/cli.ts" },
  outDir: "build/mcpb/server",
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  noExternal: [/.*/],
  dts: false,
  clean: true,
  sourcemap: false,
  esbuildOptions(options) {
    // Authoritative: esbuild never bundles anything listed here, regardless of noExternal.
    options.external = [...(options.external ?? []), ...builtinExternals];
  },
});
