// Generates random, valid male avatars for demo/preview use, drawing part ids
// and offsets from the baked catalog so every combination resolves to real
// Hattrick assets. Tones are kept consistent across face, eyes and mouth.
import catalog from "./face-catalog.json";
import type { AvatarPart, RenderInputs } from "./types.js";
import {
  DEFAULT_FIGURE_WIDTH,
  FULLBODY_ASSETS_PATH,
  neckForFaceShape,
  skinForTone,
} from "./fullbody-tables.js";
import { facePartNumbers, partOffset, type PartCategory } from "./parts-manifest.js";

type Offsets = Record<string, [number, number]>;
interface Catalog {
  faces: Offsets;
  eyes: Offsets;
  mouths: Offsets;
  noses: Offsets;
  hair: Offsets;
  _tones: { m: { shapes: Record<string, string[]> } };
}
const CAT = catalog as unknown as Catalog;
// Dynamic category lookup (byTone/forShape take a category name).
const offsetsOf = (category: string): Offsets =>
  (CAT as unknown as Record<string, Offsets>)[category] ?? {};

export interface RandomAvatarOptions {
  /** Body type 1-12; random when omitted. */
  bodyType?: number;
  /** Kit definition URL; defaults to the bundled sample kit. */
  kitJson?: string;
  width?: number;
  assetsPath?: string;
  /** Injectable RNG for deterministic tests. */
  rng?: () => number;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function part(category: string, file: string): AvatarPart {
  const off = offsetsOf(category)[file] ?? [5, 5];
  return { url: `/Img/Avatar/${category}/${file}`, x: off[0], y: off[1] };
}

/** Builds RenderInputs for a random male figure with consistent skin tone. */
export function randomRenderInputs(opts: RandomAvatarOptions = {}): RenderInputs {
  const rng = opts.rng ?? Math.random;
  const shape = pick(Object.keys(CAT._tones.m.shapes), rng);
  const tone = pick(CAT._tones.m.shapes[shape]!, rng);
  const faceFile = `f${shape}${tone}.png`;

  const forShape = (category: string): string => {
    const all = Object.keys(offsetsOf(category));
    const matched = all.filter((k) => k.startsWith(`f${shape}h`));
    return pick(matched.length ? matched : all, rng);
  };

  // Head parts (eyes/noses/mouths) are chosen from the manifest: it says which
  // part numbers exist for this face shape and the exact offset to place each
  // at. The variant file (e3a/e3b/…) comes from the catalog's known filenames;
  // the offset comes from the manifest (per shape), not the flat catalog.
  const headPart = (category: string, cat: PartCategory): AvatarPart => {
    const files = Object.keys(offsetsOf(category));
    const nums = facePartNumbers("m", shape, cat);
    for (const n of nums.sort(() => rng() - 0.5)) {
      const variants = files.filter((f) => new RegExp(`^${category[0]}${n}(?!\\d)`).test(f));
      if (variants.length) {
        const file = pick(variants, rng);
        const off = partOffset("m", shape, cat, n) ?? offsetsOf(category)[file] ?? [5, 5];
        return { url: `/Img/Avatar/${category}/${file}`, x: off[0], y: off[1] };
      }
    }
    return part(category, pick(files, rng)); // fallback: any file, catalog offset
  };

  const faceElements: AvatarPart[] = [
    part("faces", CAT.faces[faceFile] ? faceFile : pick(Object.keys(CAT.faces), rng)),
    headPart("eyes", "e"),
    headPart("noses", "n"),
    headPart("mouths", "m"),
    part("hair", forShape("hair")),
  ];

  const bodyType = opts.bodyType ?? 1 + Math.floor(rng() * 12);
  const assetsPath = opts.assetsPath ?? FULLBODY_ASSETS_PATH;
  return {
    faceElements,
    assetsPath,
    meshPath: `${assetsPath}/uvs_m/kit_${bodyType}_tri.json`,
    outlinePath: `${assetsPath}/outlines_vector_m/full_body_kit_${bodyType}.svg`,
    bodyType,
    kitJson: opts.kitJson ?? "/default-kit.json",
    width: opts.width ?? DEFAULT_FIGURE_WIDTH,
    skinColor: skinForTone(tone),
    neckPosition: neckForFaceShape(Number(shape)),
    hairOffsetX: 0,
    hairOffsetY: 0,
  };
}
