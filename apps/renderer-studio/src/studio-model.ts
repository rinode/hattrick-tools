// Framework-agnostic studio logic: the catalog/manifest-driven part lists, tone
// resolution, and assembling RenderInputs. Ported from the old vanilla main.ts.
import {
  assetPathsForBody,
  facePartNumbers,
  partOffset,
  type AvatarPart,
  type PartCategory,
  type RenderInputs,
} from "hattrick-player-renderer";
import faceCatalog from "./face-catalog.json";

export type Gender = "m" | "f";
/** Sentinel part key for the face-shape control. */
export const FACE = "@face";

type FaceCatalog = Record<string, Record<string, [number, number]>>;
export interface ToneTable {
  order: string[];
  hex: Record<string, string>;
  shapes: Record<string, string[]>;
}
const CATALOG = faceCatalog as unknown as FaceCatalog;
const TONES = (faceCatalog as unknown as { _tones: Record<Gender, ToneTable> })._tones;

export interface PartCfg {
  key: string;
  label: string;
  optional: boolean;
}
// In draw order: back (first) to front (last).
export const MALE_PARTS: PartCfg[] = [
  { key: FACE, label: "Face shape", optional: false },
  { key: "eyes", label: "Eyes", optional: false },
  { key: "noses", label: "Nose", optional: false },
  { key: "mouths", label: "Mouth", optional: false },
  { key: "goatees", label: "Goatee", optional: true },
  { key: "beards", label: "Beard", optional: true },
  { key: "hair", label: "Hair", optional: false },
  { key: "filled_hair", label: "Filled hair", optional: true },
];
export const FEMALE_PARTS: PartCfg[] = [
  { key: "hair_f_behind", label: "Hair (behind)", optional: true },
  { key: FACE, label: "Face shape", optional: false },
  { key: "eyes_f", label: "Eyes", optional: false },
  { key: "noses_f", label: "Nose", optional: false },
  { key: "mouths_f", label: "Mouth", optional: false },
  { key: "hair_f", label: "Hair", optional: false },
];

// Head-part category keys → the manifest's category letter (placed per shape).
const HEAD_CAT: Record<string, PartCategory> = {
  eyes: "e",
  noses: "n",
  mouths: "m",
  goatees: "g",
  eyes_f: "e",
  noses_f: "n",
  mouths_f: "m",
};

export function toneTable(gender: Gender): ToneTable {
  return TONES[gender];
}
export function partsFor(gender: Gender): PartCfg[] {
  return gender === "m" ? MALE_PARTS : FEMALE_PARTS;
}
function faceBaseCat(gender: Gender): string {
  return gender === "m" ? "faces" : "faces_f";
}
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
export function faceShapes(gender: Gender): string[] {
  return Object.keys(toneTable(gender).shapes).sort(naturalSort);
}
function hexLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
}
/** Nearest tone (by luminance) that `shape` actually ships. */
export function resolveTone(gender: Gender, shape: string, wanted: string): string {
  const t = toneTable(gender);
  const avail = t.shapes[shape] ?? [];
  if (avail.includes(wanted) || !avail.length) return wanted;
  const target = hexLum(t.hex[wanted] ?? "#000000");
  return avail.reduce((best, code) =>
    Math.abs(hexLum(t.hex[code] ?? "#0") - target) < Math.abs(hexLum(t.hex[best] ?? "#0") - target)
      ? code
      : best,
  );
}
export function faceFileForShape(gender: Gender, shape: string, tone: string): string {
  return `f${shape}${resolveTone(gender, shape, tone)}.png`;
}

function isUniversal(name: string): boolean {
  return !/^f\d/.test(name);
}
function matchesShape(name: string, shape: string): boolean {
  return new RegExp(`^f${shape}(?!\\d)`).test(name);
}

/** The part files valid for a gender + face shape in a category (no "none"). */
export function optionsFor(gender: Gender, shape: string, cfg: PartCfg): string[] {
  if (cfg.key === FACE) return faceShapes(gender);
  let files = Object.keys(CATALOG[cfg.key] ?? {})
    .filter((n) => isUniversal(n) || matchesShape(n, shape))
    .sort(naturalSort);
  const headCat = HEAD_CAT[cfg.key];
  if (headCat) {
    const valid = new Set(facePartNumbers(gender, shape, headCat));
    if (valid.size) {
      files = files.filter((f) => {
        const n = Number(f.match(/\d+/)?.[0]);
        return Number.isNaN(n) || valid.has(n);
      });
    }
  }
  return files;
}

export function optionLabel(cfg: PartCfg, value: string): string {
  if (!value) return "none";
  if (cfg.key === FACE) return `shape ${value}`;
  return value.replace(/\.png$/, "");
}
/** Thumbnail URL for one option (a FACE value is a shape string, drawn at `tone`). */
export function optionThumbUrl(
  base: string,
  gender: Gender,
  cfg: PartCfg,
  tone: string,
  value: string,
): string {
  if (!value) return "";
  if (cfg.key === FACE)
    return `${base}/Img/Avatar/${faceBaseCat(gender)}/${faceFileForShape(gender, value, tone)}`;
  return `${base}/Img/Avatar/${cfg.key}/${value}`;
}

export interface StudioModel {
  gender: Gender;
  tone: string;
  shape: string;
  /** part key → chosen filename ("" = none). */
  sel: Record<string, string>;
}
export interface LayoutModel {
  bodyType: number;
  width: number;
  neckPosition: number;
  hairOffsetX: number;
  hairOffsetY: number;
  kitJson: string;
}

function buildFaceElements(s: StudioModel): AvatarPart[] {
  const out: AvatarPart[] = [];
  const faceCat = faceBaseCat(s.gender);
  for (const cfg of partsFor(s.gender)) {
    if (cfg.key === FACE) {
      const file = faceFileForShape(s.gender, s.shape, s.tone);
      const off = CATALOG[faceCat]?.[file] ?? [5, 5];
      out.push({ url: `/Img/Avatar/${faceCat}/${file}`, x: off[0], y: off[1] });
      continue;
    }
    const value = s.sel[cfg.key] ?? "";
    if (!value) continue;
    const headCat = HEAD_CAT[cfg.key];
    const off =
      (headCat && partOffset(s.gender, s.shape, headCat, value)) ??
      CATALOG[cfg.key]?.[value] ??
      [5, 5];
    out.push({ url: `/Img/Avatar/${cfg.key}/${value}`, x: off[0], y: off[1] });
  }
  return out;
}

export function gatherInputs(s: StudioModel, l: LayoutModel): RenderInputs {
  const paths = assetPathsForBody(l.bodyType);
  return {
    faceElements: buildFaceElements(s),
    assetsPath: paths.assetsPath,
    meshPath: paths.meshPath,
    outlinePath: paths.outlinePath,
    bodyType: l.bodyType,
    kitJson: l.kitJson.trim() || "/default-kit.json",
    width: l.width,
    skinColor: toneTable(s.gender).hex[s.tone] ?? "#caa",
    neckPosition: l.neckPosition,
    hairOffsetX: l.hairOffsetX,
    hairOffsetY: l.hairOffsetY,
  };
}

export { assetPathsForBody };
