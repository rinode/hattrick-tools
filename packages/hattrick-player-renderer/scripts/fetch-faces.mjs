#!/usr/bin/env node
// Mirrors Hattrick's avatar face-part catalogue into ./vendor/Img/Avatar so the
// renderer can composite any player's face (male or female) without fetching
// from Hattrick at runtime. Run from a machine with normal internet access (NOT
// the Cloudflare worker — its egress is rate-limited by Hattrick):
//
//   node scripts/fetch-faces.mjs
//
// It is resumable: files already on disk are skipped, so re-runs are cheap.
//
// Two sources drive the enumeration:
//   1. src/avatar-parts.json — the saved GetFacePartsJson manifest. It lists,
//      authoritatively, which eyes/noses/mouths/goatees exist per face shape per
//      gender (we take the union of numbers across shapes). We still probe the
//      per-part variant suffixes (a/b/c, g, mustache colours) and prune 404s.
//   2. The filename grammar for the parts the manifest does NOT cover — faces,
//      hair and beards — probed over generous ranges (a 404 prunes a candidate).
//
// Directory layout (male parts in the base dirs, female parts in the _f dirs):
//   faces/f{shape}{tone}.png              faces_f/f{shape}{tone}.png
//   eyes/e{n}{a|b|c}.png                  eyes_f/e{n}{a|b|c}.png
//   mouths/m{n}{a|b|c}[g].png             mouths_f/m{n}{a|b|c}.png
//   noses/n{n}[m{color}].png             noses_f/n{n}.png
//   goatees/g{n}.png                      (none — female has no facial hair)
//   hair/f{shape}h0.png (bald)            hair_f/f{shape}h{style}{color}.png
//   hair/f{shape}{h|r}{style}{color}.png  hair_f_behind/f{shape}r{style}{color}.png
//   beards/f{shape}b{style}{color}.png    (none)
// Beard-variant composites (male only) are derived from the base mouths/noses
// that exist, not blindly brute-forced:
//   mouths/f{shape}be{baseMouth}          noses/f{shape}be{baseNose}
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.HATTRICK_ORIGIN ?? "https://www.hattrick.org";
const PREFIX = "/Img/Avatar/";
const CONC = Number(process.env.FETCH_CONC ?? 24); // be polite; Hattrick throttles bursts
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const here = dirname(fileURLToPath(import.meta.url));
const vendorRoot = resolve(here, "..", "vendor");
const manifestPath = resolve(here, "..", "src", "avatar-parts.json");

// --- Ranges (pruned by 404) --------------------------------------------------
const MALE_SHAPES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const FEMALE_SHAPES = [4, 5, 6, 7, 8, 9];
const FACE_TONES = "abcdefghijkl".split(""); // face base tone letters
const PV = ["a", "b", "c"]; // eye/mouth part variants
const MALE_HAIR_COLORS = "abcdefghijk".split(""); // male hair/beard colours a..k
const FEMALE_HAIR_COLORS = "abcdefghijklmnop".split(""); // female hair colours a..p
// A nose is either plain (n{N}) or a mustache variant n{N}m{hairColor} (male
// only); mustache colours run a..k like hair.
const MALE_NOSE_SUFFIX = ["", ...MALE_HAIR_COLORS.map((c) => `m${c}`)];
const STYLE_MAX = 30; // hair/beard style numbers (generous; pruned by 404)

/** Union of part numbers across all shapes for one gender+category in the manifest. */
function manifestNums(manifest, genderKey, cat) {
  const byShape = manifest[genderKey] ?? {};
  const nums = new Set();
  for (const shape of Object.keys(byShape)) {
    for (const n of Object.keys(byShape[shape]?.[cat] ?? {})) nums.add(Number(n));
  }
  return [...nums].sort((a, b) => a - b);
}

// --- Candidate builders ------------------------------------------------------
/** Base mouths/noses (male) whose existence we discover, to feed composites. */
function maleBaseMouths(nums) {
  const out = [];
  for (const n of nums)
    for (const v of PV) {
      out.push(`m${n}${v}`);
      out.push(`m${n}${v}g`);
    }
  return out;
}
function maleBaseNoses(nums) {
  const out = [];
  for (const n of nums) for (const s of MALE_NOSE_SUFFIX) out.push(`n${n}${s}`);
  return out;
}

/** Standalone male candidates (faces, eyes, goatees, hair, beards). */
function maleStandalone(manifest) {
  const c = [];
  for (const s of MALE_SHAPES) for (const t of FACE_TONES) c.push(`faces/f${s}${t}.png`);
  for (const n of manifestNums(manifest, "m", "e")) for (const v of PV) c.push(`eyes/e${n}${v}.png`);
  for (const n of manifestNums(manifest, "m", "g")) c.push(`goatees/g${n}.png`);
  for (const s of MALE_SHAPES) {
    c.push(`hair/f${s}h0.png`); // bald
    for (let st = 1; st <= STYLE_MAX; st++)
      for (const t of MALE_HAIR_COLORS) {
        c.push(`hair/f${s}h${st}${t}.png`);
        c.push(`hair/f${s}r${st}${t}.png`); // behind-head layer (same dir, male)
        c.push(`beards/f${s}b${st}${t}.png`);
      }
  }
  return c;
}

/** Female candidates. No facial hair, so no goatees/beards/mustache-noses. */
function femaleStandalone(manifest) {
  const c = [];
  for (const s of FEMALE_SHAPES) for (const t of FACE_TONES) c.push(`faces_f/f${s}${t}.png`);
  for (const n of manifestNums(manifest, "f", "e")) for (const v of PV) c.push(`eyes_f/e${n}${v}.png`);
  for (const n of manifestNums(manifest, "f", "m")) for (const v of PV) c.push(`mouths_f/m${n}${v}.png`);
  for (const n of manifestNums(manifest, "f", "n")) c.push(`noses_f/n${n}.png`);
  for (const s of FEMALE_SHAPES)
    for (let st = 1; st <= STYLE_MAX; st++)
      for (const t of FEMALE_HAIR_COLORS) {
        c.push(`hair_f/f${s}h${st}${t}.png`);
        c.push(`hair_f_behind/f${s}r${st}${t}.png`); // behind-head layer (own dir, female)
      }
  return c;
}

// --- Fetch plumbing ----------------------------------------------------------
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

// --- Run ---------------------------------------------------------------------
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
console.log(`Mirroring avatar parts from ${ORIGIN}${PREFIX} (concurrency ${CONC})…`);

// Male: standalone parts, then discover which base mouths/noses exist, then
// derive the beard composites from them.
const maleStd = await download(maleStandalone(manifest), "male faces/eyes/hair/beards/goatees");
const maleMouths = await download(
  maleBaseMouths(manifestNums(manifest, "m", "m")).map((m) => `mouths/${m}.png`),
  "male base mouths",
);
const maleNoses = await download(
  maleBaseNoses(manifestNums(manifest, "m", "n")).map((n) => `noses/${n}.png`),
  "male base noses",
);
const baseMouthNames = maleMouths.map((p) => p.replace(/^mouths\//, "").replace(/\.png$/, ""));
const baseNoseNames = maleNoses
  .map((p) => p.replace(/^noses\//, "").replace(/\.png$/, ""))
  .filter((n) => /^n\d+$/.test(n)); // beard noses derive from plain base noses only
const composites = [];
for (const s of MALE_SHAPES) {
  for (const m of baseMouthNames) composites.push(`mouths/f${s}be${m}.png`);
  for (const n of baseNoseNames) composites.push(`noses/f${s}be${n}.png`);
}
const maleComp = await download(composites, "male beard composites");

// Female: no facial hair, so no composites.
const femaleStd = await download(femaleStandalone(manifest), "female faces/eyes/noses/mouths/hair");

const total =
  maleStd.length + maleMouths.length + maleNoses.length + maleComp.length + femaleStd.length;
console.log(`\nDone: ${total} avatar part files present under ${join(vendorRoot, PREFIX)}`);
