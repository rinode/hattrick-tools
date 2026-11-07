// Authoritative avatar-part manifest, saved verbatim from Hattrick's
// GetFacePartsJson (AvatarParts.asmx). It lists, per gender and face shape,
// which eyes/noses/mouths/goatees exist and the exact x/y offset Hattrick's own
// editor places each at. This is the source of truth the render paths consult
// for head-part placement, instead of a single sampled offset per file.
//
// Keys: gender "m" | "f" → face shape → category → part number → {x, y}.
// Categories: e = eyes, n = noses, m = mouths, g = goatees (goatees are male
// only; female entries carry placeholder offsets, matching Hattrick's editor).
// Faces, hair and beards are NOT in this manifest — they come from the vendored
// file listing / catalog.
import manifest from "./avatar-parts.json";
import type { Gender } from "./from-avatars.js";

/** A head-part category as keyed in the manifest. */
export type PartCategory = "e" | "n" | "m" | "g";

type OffsetMap = Record<string, { x: number; y: number }>;
type ShapeParts = Record<PartCategory, OffsetMap>;
type GenderParts = Record<string, ShapeParts>;
interface AvatarPartsManifest {
  m: GenderParts;
  f: GenderParts;
}

export const AVATAR_PARTS = manifest as unknown as AvatarPartsManifest;

function genderKey(g: Gender | undefined): "m" | "f" {
  return g === 2 || g === "f" ? "f" : "m";
}

/** The part numbers that exist for a gender + face shape + category, ascending. */
export function facePartNumbers(
  gender: Gender,
  shape: number | string,
  cat: PartCategory,
): number[] {
  const parts = AVATAR_PARTS[genderKey(gender)]?.[String(shape)]?.[cat] ?? {};
  return Object.keys(parts)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * The offset Hattrick places this part at on the given face shape, or undefined
 * when the manifest has no entry (caller should fall back). `num` may be the
 * bare part number or a filename like "e3b.png" / "n27mc.png".
 */
export function partOffset(
  gender: Gender,
  shape: number | string,
  cat: PartCategory,
  num: number | string,
): [number, number] | undefined {
  const n = typeof num === "number" ? String(num) : (num.match(/\d+/)?.[0] ?? num);
  const hit = AVATAR_PARTS[genderKey(gender)]?.[String(shape)]?.[cat]?.[n];
  return hit ? [hit.x, hit.y] : undefined;
}
