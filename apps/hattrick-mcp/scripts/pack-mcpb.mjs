// Assembles and packs the MCPB bundle:
//   build/mcpb/
//     manifest.json       (copied from the app root)
//     server/index.js      (self-contained bundle, from tsup.mcpb.config.ts)
//     knowledge/*.md        (bundled knowledge base)
// then runs `mcpb pack` to produce dist-mcpb/hattrick-mcp.mcpb.
//
// Usage: node scripts/pack-mcpb.mjs   (run after `tsup --config tsup.mcpb.config.ts`)
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const bundleDir = `${appDir}/build/mcpb`;
const outDir = `${appDir}/dist-mcpb`;
const outFile = `${outDir}/hattrick-mcp.mcpb`;

if (!existsSync(`${bundleDir}/server/index.js`)) {
  console.error("bundle missing — run: tsup --config tsup.mcpb.config.ts first");
  process.exit(1);
}

copyFileSync(`${appDir}/manifest.json`, `${bundleDir}/manifest.json`);
cpSync(`${appDir}/knowledge`, `${bundleDir}/knowledge`, { recursive: true });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// `mcpb pack <dir> <out>` validates manifest.json and zips the directory.
execFileSync("npx", ["--yes", "@anthropic-ai/mcpb", "pack", bundleDir, outFile], {
  stdio: "inherit",
});
console.log(`\nPacked ${outFile}`);
