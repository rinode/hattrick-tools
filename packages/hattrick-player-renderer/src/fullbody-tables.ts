// Lookup tables for the full-body figure parameters that Hattrick's player page
// supplies to HT.FullBodies.init but the CHPP `avatars` API does not. Harvested
// from 82 players across 11 teams (a Dutch league + Nigeria/Ghana/Senegal/India
// national squads); every value was fully consistent for its key.
//
//   skinColor   keys off the skin TONE (the trailing letter of the face file,
//               e.g. "faces/f9a.png" -> "a").
//   neckPosition keys off the FACE SHAPE (the number, e.g. "f9a" -> 9).
//   hairOffset   is 0,0 for all but rare hairstyles (defaulted to 0 here).
//   width        is a constant 240.

/** Body-skin hex by skin tone (a–m). */
export const SKIN_BY_TONE: Readonly<Record<string, string>> = {
  a: "#eccaba",
  b: "#f6d8bc",
  c: "#f9e4d2",
  d: "#b58e63",
  e: "#f4dfb0",
  f: "#764d2f",
  g: "#a96743",
  h: "#cc7a56",
  i: "#dab384",
  j: "#c18472",
  k: "#946040",
  l: "#eaa673",
  m: "#fecb98",
};

/** Neck attach position by face shape (1–9). */
export const NECK_BY_FACE_SHAPE: Readonly<Record<number, number>> = {
  1: 82,
  2: 84,
  3: 85,
  4: 91,
  5: 86,
  6: 84,
  7: 75,
  8: 80,
  9: 87,
};

/** Output figure width in pixels (page constant). */
export const DEFAULT_FIGURE_WIDTH = 240;

/** Base path of the vendored full-body asset tree. */
export const FULLBODY_ASSETS_PATH = "/Club/Players/Avatars/fullbody_assets";

/** Tones ordered light→dark (for nearest-tone fallback). */
export const TONE_ORDER = ["c", "e", "b", "m", "a", "l", "i", "d", "j", "h", "g", "k", "f"];

/** Skin hex for a tone, falling back to the nearest known tone in the ramp. */
export function skinForTone(tone: string): string {
  if (SKIN_BY_TONE[tone]) return SKIN_BY_TONE[tone]!;
  const idx = TONE_ORDER.indexOf(tone);
  if (idx >= 0) {
    for (let d = 1; d < TONE_ORDER.length; d++) {
      const lo = TONE_ORDER[idx - d];
      const hi = TONE_ORDER[idx + d];
      if (lo && SKIN_BY_TONE[lo]) return SKIN_BY_TONE[lo]!;
      if (hi && SKIN_BY_TONE[hi]) return SKIN_BY_TONE[hi]!;
    }
  }
  return SKIN_BY_TONE.a!; // last-resort default
}

/** Neck position for a face shape, falling back to the overall median (85). */
export function neckForFaceShape(shape: number): number {
  return NECK_BY_FACE_SHAPE[shape] ?? 85;
}
