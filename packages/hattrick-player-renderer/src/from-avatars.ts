// Builds RenderInputs from the CHPP `avatars` API instead of scraping the
// player page. This is the backend-free input path: everything the full-body
// figure needs is either in the avatar layer list or derived from it plus the
// baked lookup tables (see fullbody-tables.ts). Shared by the team-photo app
// and the renderer-studio UI.

import type { AvatarPart, RenderInputs } from "./types.js";
import {
  DEFAULT_FIGURE_WIDTH,
  FULLBODY_ASSETS_PATH,
  neckForFaceShape,
  skinForTone,
} from "./fullbody-tables.js";

/**
 * One layer of a CHPP avatar — the shape hattrick-chpp's `Avatar` uses
 * (lowercase), which is what the backend serialises to the frontend.
 */
export interface AvatarLayer {
  image: string;
  x?: number;
  y?: number;
}

/** A player's CHPP avatar: a background plus ordered layers. */
export interface PlayerAvatar {
  backgroundImage?: string;
  layers: AvatarLayer[];
}

/** "m"/"f", or a CHPP GenderID number (1 male, 2 female). */
export type Gender = "m" | "f" | number;

export interface FromAvatarOptions {
  /** Player gender (from players.xml GenderID: 1 male, 2 female). Default male. */
  gender?: Gender;
  /** Output width in pixels. Default 240 (the page constant). */
  width?: number;
  /** Full-body asset tree base path. Default the vendored path. */
  assetsPath?: string;
}

const HEAD_CATEGORIES = ["faces", "eyes", "mouths", "noses", "hair", "beards", "goatees"];
const AVATAR_PREFIX = "/Img/Avatar/";

// The avatars API positions head parts on the small avatar card, which sits 4px
// right and 5px down from the full-body renderer's face origin. The player page
// subtracts this from every part's coordinates; match it so hair and the other
// parts land correctly on the full body.
const CARD_INSET_X = 4;
const CARD_INSET_Y = 5;

function genderCode(g: Gender | undefined): "m" | "f" {
  return g === 2 || g === "f" ? "f" : "m";
}

/** Category of an /Img/Avatar/<cat>/… layer, or null for kit/other images. */
function category(image: string): string | null {
  if (!image.startsWith(AVATAR_PREFIX)) return null;
  return image.slice(AVATAR_PREFIX.length).split("/")[0] ?? null;
}

/**
 * Derives RenderInputs from a player's CHPP avatar. Face shape → neck and skin
 * tone → colour come from the baked tables; body type, kit and the head parts
 * come straight from the avatar layers (reproducing the page's init exactly).
 */
export function renderInputsFromAvatar(
  avatar: PlayerAvatar,
  opts: FromAvatarOptions = {},
): RenderInputs {
  const g = genderCode(opts.gender);
  const assetsPath = opts.assetsPath ?? FULLBODY_ASSETS_PATH;
  const layers = avatar.layers ?? [];

  // Head-overlay parts, in layer order. Keep the full "/Img/Avatar/…" path: the
  // renderer's absolutize() prepends the asset origin to a root-absolute path,
  // so stripping the prefix produced a malformed URL. The host serves these
  // same-origin (the worker proxies /Img/Avatar/* to Hattrick). Coordinates are
  // shifted by the card inset to match the full-body renderer's origin.
  const faceElements: AvatarPart[] = layers
    .filter((l) => {
      const cat = category(l.image);
      return cat !== null && HEAD_CATEGORIES.includes(cat);
    })
    .map((l) => ({ url: l.image, x: (l.x ?? 0) - CARD_INSET_X, y: (l.y ?? 0) - CARD_INSET_Y }));

  // Body type + kit from the kit body image (res.hattrick.org/kits/.../bodyN.png).
  let bodyType = 1;
  let kitJson = "";
  const kitLayer = layers.find(
    (l) => /\/body\d+\.png$/.test(l.image) && !l.image.startsWith(AVATAR_PREFIX),
  );
  if (kitLayer) {
    const n = kitLayer.image.match(/\/body(\d+)\.png$/);
    if (n) bodyType = Number(n[1]);
    kitJson = kitLayer.image.replace(/\/body\d+\.png$/, "/kitData.json").replace(/^https?:/, "");
  }

  // Face shape + skin tone from the face layer ("faces/f<shape><tone>.png").
  const faceLayer = layers.find((l) => category(l.image) === "faces");
  const fm = faceLayer?.image.match(/faces\/f(\d+)([a-z])/);
  const faceShape = fm ? Number(fm[1]) : 1;
  const tone = fm?.[2] ?? "a";

  return {
    faceElements,
    assetsPath,
    meshPath: `${assetsPath}/uvs_${g}/kit_${bodyType}_tri.json`,
    outlinePath: `${assetsPath}/outlines_vector_${g}/full_body_kit_${bodyType}.svg`,
    bodyType,
    kitJson,
    width: opts.width ?? DEFAULT_FIGURE_WIDTH,
    skinColor: skinForTone(tone),
    neckPosition: neckForFaceShape(faceShape),
    hairOffsetX: 0,
    hairOffsetY: 0,
  };
}
