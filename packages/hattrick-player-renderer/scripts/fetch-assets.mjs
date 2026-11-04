#!/usr/bin/env node
// Downloads Hattrick's static full-body renderer bundle and per-body-type
// assets into ./vendor so the renderer runs standalone (no Hattrick at
// runtime). Run once from a machine with normal internet access:
//
//   pnpm --filter hattrick-player-renderer fetch-assets
//
// Only the STATIC set is fetched (engine + 12 body SVGs/meshes/shapes) plus a
// sample kit so the studio has one locally. These are text files. Per-player
// face PNGs and real kit data are dynamic and come from input provision.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.HATTRICK_ORIGIN ?? "https://www.hattrick.org";
const SAMPLE_KIT_URL =
  process.env.SAMPLE_KIT_URL ?? "https://res.hattrick.org/kits/35/342/3420/3419013/kitData.json";
const BODY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const VARIANT = "m";
const BASE = "/Club/Players/Avatars/fullbody_assets";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: `${ORIGIN}/en/Club/Players/Avatars/`,
  Accept: "application/json,text/plain,*/*",
};

const paths = ["/Club/Players/Avatars/slimkitrender.js", "/Club/Players/Avatars/HT.FullBodies.js"];
for (const n of BODY_TYPES) {
  paths.push(`${BASE}/outlines_vector_${VARIANT}/full_body_kit_${n}.svg`);
  paths.push(`${BASE}/uvs_${VARIANT}/kit_${n}_tri.json`);
  paths.push(`${BASE}/shapes/kit_shape_${n}.txt`);
}

const vendorRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "vendor");

async function fetchWithRetry(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw lastErr;
}

async function save(relPath, buf) {
  const dest = join(vendorRoot, relPath);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

const missing = [];
let ok = 0;
for (const p of paths) {
  try {
    const buf = await fetchWithRetry(ORIGIN + p);
    await save(p, buf);
    ok++;
    console.log(`saved ${p} (${buf.length} bytes)`);
  } catch (e) {
    missing.push(p);
    console.warn(`MISSING ${p}: ${e instanceof Error ? e.message : e}`);
  }
}

// A sample kit so the studio renders out of the box (served at /sample-kit.json).
try {
  const buf = await fetchWithRetry(SAMPLE_KIT_URL);
  await save("sample-kit.json", buf);
  console.log(`saved /sample-kit.json (${buf.length} bytes)`);
} catch (e) {
  console.warn(`MISSING sample kit: ${e instanceof Error ? e.message : e}`);
}

// Per-player face PNGs are gated the same way as the meshes (Referer-checked),
// so they are vendored here too, via the same fetchWithRetry/HEADERS. They are
// binaries and kept out of git (vendor/Img/Avatar/ is gitignored); run this on
// a machine with normal internet access to populate them locally.
let faces = 0;
try {
  const catUrl = new URL("../../../apps/renderer-studio/src/face-catalog.json", import.meta.url);
  const catalog = JSON.parse(await readFile(catUrl, "utf8"));
  const facePaths = [];
  for (const [cat, files] of Object.entries(catalog)) {
    for (const file of Object.keys(files)) facePaths.push(`/Img/Avatar/${cat}/${file}`);
  }
  const { existsSync } = await import("node:fs");
  for (const fp of facePaths) {
    if (existsSync(join(vendorRoot, fp))) { faces++; continue; }
    await new Promise((r) => setTimeout(r, 150)); // throttle: Hattrick rate-limits bursts
    try {
      const buf = await fetchWithRetry(ORIGIN + fp);
      await save(fp, buf);
      faces++;
    } catch (e) {
      console.warn(`MISSING ${fp}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`saved ${faces}/${facePaths.length} face PNGs under /Img/Avatar/`);
} catch (e) {
  console.warn(`face catalog not read (skipping face PNGs): ${e instanceof Error ? e.message : e}`);
}

console.log(`\nDone: ${ok}/${paths.length} static assets into ${vendorRoot}`);
if (missing.length) {
  console.error(`Still missing ${missing.length}:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
