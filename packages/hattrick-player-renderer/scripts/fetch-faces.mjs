#!/usr/bin/env node
// Mirrors Hattrick's avatar face-part catalogue into ./vendor/Img/Avatar so the
// renderer can composite any player's face without fetching from Hattrick at
// runtime. Hattrick publishes no manifest, so we enumerate the filename grammar
// over generous ranges and keep whatever actually exists (a 404 just prunes a
// candidate). Run from a machine with normal internet access (NOT the Cloudflare
// worker — its egress is rate-limited by Hattrick):
//
//   node scripts/fetch-faces.mjs
//
// It is resumable: files already on disk are skipped, so re-runs are cheap.
//
// Grammar (male shapes f1-f9, tones a-l; female parts reuse the same dirs at
// higher indices, so the ranges are deliberately wide):
//   faces/f{shape}{tone}.png
//   eyes/e{n}{a|b|c}.png
//   mouths/m{n}{a|b|c}[g].png
//   noses/n{n}[suffix].png            suffix in "", mc, md, mb, me, ma
//   goatees/g{n}.png
//   hair/f{shape}h{style}{tone}.png   plus h0 (bald, no tone)
//   hair/f{shape}r{style}{tone}.png   the behind-the-head hair layer
//   beards/f{shape}b{style}{tone}.png
// Beard-variant composites (used when a player has a beard) are derived from the
// base mouths/noses that exist, not blindly brute-forced:
//   mouths/f{shape}be{baseMouth}       e.g. f3be + m19c -> f3bem19c.png
//   noses/f{shape}be{baseNose}         e.g. f3be + n27  -> f3ben27.png
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.HATTRICK_ORIGIN ?? "https://www.hattrick.org";
const PREFIX = "/Img/Avatar/";
const CONC = Number(process.env.FETCH_CONC ?? 24); // be polite; Hattrick throttles bursts
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const vendorRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "vendor");

const SHAPES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TONES = "abcdefghijkl".split(""); // face/hair/beard tone letters
const PV = ["a", "b", "c"]; // eye/mouth part variants
const NOSE_SUFFIX = ["", "mc", "md", "mb", "me", "ma"];
const STYLE_MAX = 30; // hair/beard style numbers (generous; pruned by 404)
const EYE_MAX = 80;
const MOUTH_MAX = 70;
const NOSE_MAX = 90;
const GOATEE_MAX = 20;

/** Base-part candidates whose existence we must discover (feeds composites). */
function baseMouths() {
  const out = [];
  for (let n = 1; n <= MOUTH_MAX; n++)
    for (const v of PV) {
      out.push(`m${n}${v}`);
      out.push(`m${n}${v}g`);
    }
  return out;
}
function baseNoses() {
  const out = [];
  for (let n = 1; n <= NOSE_MAX; n++) for (const s of NOSE_SUFFIX) out.push(`n${n}${s}`);
  return out;
}

/** Candidates that don't feed anything else (enumerate + download directly). */
function standaloneCandidates() {
  const c = [];
  for (const s of SHAPES) for (const t of TONES) c.push(`faces/f${s}${t}.png`);
  for (let n = 1; n <= EYE_MAX; n++) for (const v of PV) c.push(`eyes/e${n}${v}.png`);
  for (let n = 1; n <= GOATEE_MAX; n++) c.push(`goatees/g${n}.png`);
  for (const s of SHAPES) {
    c.push(`hair/f${s}h0.png`); // bald
    for (let st = 1; st <= STYLE_MAX; st++)
      for (const t of TONES) {
        c.push(`hair/f${s}h${st}${t}.png`);
        c.push(`hair/f${s}r${st}${t}.png`); // behind-head layer
        c.push(`beards/f${s}b${st}${t}.png`);
      }
  }
  return c;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** GET one asset with one retry on a 5xx; returns bytes, null (absent), or throws. */
async function getAsset(path) {
  const url = ORIGIN + PREFIX + path;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 404) return null;
    if (r.ok) {
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) return null; // soft-404 HTML etc.
      return Buffer.from(await r.arrayBuffer());
    }
    if (r.status >= 500) {
      await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
      continue;
    }
    return null; // 403/4xx: treat as absent
  }
  return null;
}

/** Downloads a list of relative paths; returns the ones that existed. */
async function download(paths, label) {
  let saved = 0;
  let found = 0;
  let i = 0;
  const exists = [];
  async function worker() {
    while (i < paths.length) {
      const rel = paths[i++];
      const dest = join(vendorRoot, PREFIX, rel);
      if (await fileExists(dest)) {
        found++;
        exists.push(rel);
        continue;
      }
      let bytes = null;
      try {
        bytes = await getAsset(rel);
      } catch {
        bytes = null;
      }
      if (bytes) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, bytes);
        saved++;
        found++;
        exists.push(rel);
      }
      if ((saved + 1) % 200 === 0) process.stdout.write(`\r${label}: ${found} found (${saved} new)…`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`\n${label}: ${found} exist (${saved} downloaded).`);
  return exists;
}

console.log(`Mirroring avatar parts from ${ORIGIN}${PREFIX} (concurrency ${CONC})…`);

// Phase 1: standalone parts + discover which base mouths/noses exist.
const standalone = await download(standaloneCandidates(), "faces/eyes/hair/beards/goatees");
const mouths = await download(
  baseMouths().map((m) => `mouths/${m}.png`),
  "base mouths",
);
const noses = await download(
  baseNoses().map((n) => `noses/${n}.png`),
  "base noses",
);

// Phase 2: beard composites, derived only from base parts that exist.
const baseMouthNames = mouths.map((p) => p.replace(/^mouths\//, "").replace(/\.png$/, ""));
const baseNoseNames = noses.map((p) => p.replace(/^noses\//, "").replace(/\.png$/, ""));
const composites = [];
for (const s of SHAPES) {
  for (const m of baseMouthNames) composites.push(`mouths/f${s}be${m}.png`);
  for (const n of baseNoseNames) composites.push(`noses/f${s}be${n}.png`);
}
const comp = await download(composites, "beard composites");

const total = standalone.length + mouths.length + noses.length + comp.length;
console.log(`\nDone: ${total} avatar part files present under ${join(vendorRoot, PREFIX)}`);
