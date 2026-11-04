/**
 * The *static* asset set the renderer needs to run standalone: Hattrick's
 * engine bundle plus the per-body-type outline SVGs, UV meshes and shape
 * files. These never change per player, so they can be vendored once and
 * served locally (see scripts/fetch-assets.mjs). Per-player face PNGs and
 * kit data are dynamic and come from the input-provision step instead.
 */
export const BODY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Variant folders. Hattrick currently ships a single male vector set. */
export const VARIANT = "m";

/** Renderer engine scripts, relative to the Hattrick origin. */
export const ENGINE_PATHS = [
  "/Club/Players/Avatars/slimkitrender.js",
  "/Club/Players/Avatars/HT.FullBodies.js",
] as const;

/** Relative paths of every static full-body asset, keyed under the origin. */
export function staticAssetPaths(): string[] {
  const base = "/Club/Players/Avatars/fullbody_assets";
  const paths: string[] = [];
  for (const n of BODY_TYPES) {
    paths.push(`${base}/outlines_vector_${VARIANT}/full_body_kit_${n}.svg`);
    paths.push(`${base}/uvs_${VARIANT}/kit_${n}_tri.json`);
    paths.push(`${base}/shapes/kit_shape_${n}.txt`);
  }
  return paths;
}

/** Everything the setup script pulls to make rendering standalone. */
export function allVendorPaths(): string[] {
  return [...ENGINE_PATHS, ...staticAssetPaths()];
}

/** The per-body-type asset paths, optionally prefixed with an origin. */
export function assetPathsForBody(
  bodyType: number,
  origin = "",
): { assetsPath: string; meshPath: string; outlinePath: string } {
  const base = `${origin}/Club/Players/Avatars/fullbody_assets`;
  return {
    assetsPath: base,
    meshPath: `${base}/uvs_${VARIANT}/kit_${bodyType}_tri.json`,
    outlinePath: `${base}/outlines_vector_${VARIANT}/full_body_kit_${bodyType}.svg`,
  };
}
