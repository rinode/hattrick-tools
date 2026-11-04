#!/usr/bin/env node
// Downloads Hattrick's static full-body renderer bundle and per-body-type
// assets into ./vendor so the renderer runs standalone (no Hattrick at
// runtime). Run this once from a machine with normal internet access:
//
//   pnpm --filter hattrick-player-renderer fetch-assets
//
// Only the STATIC set is fetched (engine + 12 body SVGs/meshes/shapes); these
// are text files. Per-player face PNGs and kit data are dynamic and come from
// the input-provision step, not from here.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.HATTRICK_ORIGIN ?? "https://www.hattrick.org";
const BODY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const VARIANT = "m";
const BASE = "/Club/Players/Avatars/fullbody_assets";

const paths = ["/Club/Players/Avatars/slimkitrender.js", "/Club/Players/Avatars/HT.FullBodies.js"];
for (const n of BODY_TYPES) {
  paths.push(`${BASE}/outlines_vector_${VARIANT}/full_body_kit_${n}.svg`);
  paths.push(`${BASE}/uvs_${VARIANT}/kit_${n}_tri.json`);
  paths.push(`${BASE}/shapes/kit_shape_${n}.txt`);
}

const vendorRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "vendor");

let ok = 0;
let missing = 0;
for (const p of paths) {
  const url = ORIGIN + p;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`skip ${p} (HTTP ${res.status})`);
      missing++;
      continue;
    }
    const body = Buffer.from(await res.arrayBuffer());
    const dest = join(vendorRoot, p);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, body);
    console.log(`saved ${p} (${body.length} bytes)`);
    ok++;
  } catch (err) {
    console.error(`error ${p}: ${err instanceof Error ? err.message : err}`);
    missing++;
  }
}

console.log(`\nDone: ${ok} saved, ${missing} missing, into ${vendorRoot}`);
if (ok === 0) {
  console.error("Nothing downloaded — is this machine able to reach hattrick.org?");
  process.exit(1);
}
