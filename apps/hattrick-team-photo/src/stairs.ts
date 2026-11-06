// The stair floor as a parameterized SVG tile, so every dimension and colour is
// easy to change. One tile is one step, top to bottom: a dark edge, the grey top
// surface (the tread you stand on), a nosing edge, a solid cast shadow, and the
// pink front/side face. The tile is drawn per figure row and repeated across the
// width (see compose.ts).
//
// Only the front/side face scales. The grey top keeps a fixed height, so a
// taller front grows the tile downward only; the same front height feeds the
// layout's rowRise, so the figure rows spread apart as the steps get taller.
export interface StairStyle {
  tileWidth: number;
  tileHeight: number;
  /** Thickness of the dark edge lines. */
  edgeThickness: number;
  /** Height of the grey top surface (the tread). Fixed. */
  topHeight: number;
  /** Height of the solid cast shadow at the top of the front face. Fixed. */
  shadowHeight: number;
  /** Height of the front/side face (the adjustable dimension). */
  frontHeight: number;
  edge: string;
  top: string;
  shadow: string;
  front: string;
}

export const DEFAULT_FRONT = 25;
export const FRONT_MIN = 20;
export const FRONT_MAX = 90;

const EDGE = 3.5;
/** Fixed height of the grey top surface. */
const TOP = 56;
/** Fixed height of the solid cast shadow. */
const SHADOW = 12;
// How much a front step covers the one behind. Kept small (near the edge
// thickness) so each step hides almost none of the step behind, and every
// step's front face reads about the same height, front row included.
const OVERLAP = 6;

/** Builds a stair style for a given front/side face height. */
export function stairStyle(frontHeight: number = DEFAULT_FRONT): StairStyle {
  return {
    tileWidth: 128,
    tileHeight: EDGE + TOP + EDGE + SHADOW + frontHeight + EDGE,
    edgeThickness: EDGE,
    topHeight: TOP,
    shadowHeight: SHADOW,
    frontHeight,
    edge: "#0d0805",
    top: "#d3d3d3",
    shadow: "#bfabac",
    front: "#dccece",
  };
}

/** Row spacing for a front height: the tile height less the overlap, so steps overlap. */
export function stairRowRise(frontHeight: number = DEFAULT_FRONT): number {
  return Math.round(EDGE + TOP + EDGE + SHADOW + frontHeight + EDGE - OVERLAP);
}

export const STAIR_STYLE: StairStyle = stairStyle(DEFAULT_FRONT);

/** Builds the stair-tile SVG markup for a given style. */
export function stairTileSvg(s: StairStyle = STAIR_STYLE): string {
  const { tileWidth: w, tileHeight: h, edgeThickness: t } = s;
  const topBand = t; // grey top starts below the first edge
  const nosingTop = t + s.topHeight;
  const shadowTop = nosingTop + t;
  const bottomEdgeTop = h - t;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="${w}" height="${h}" fill="${s.front}"/>` + // pink front fills the lower tile
    `<rect y="0" width="${w}" height="${t}" fill="${s.edge}"/>` + // top edge
    `<rect y="${topBand}" width="${w}" height="${s.topHeight}" fill="${s.top}"/>` + // grey top surface
    `<rect y="${nosingTop}" width="${w}" height="${t}" fill="${s.edge}"/>` + // nosing edge
    `<rect y="${shadowTop}" width="${w}" height="${s.shadowHeight}" fill="${s.shadow}"/>` + // solid cast shadow
    `<rect y="${bottomEdgeTop}" width="${w}" height="${t}" fill="${s.edge}"/>` + // bottom edge
    `</svg>`
  );
}

/** The stair tile for a given front height, as a data URL ready to load into an Image. */
export function stairTileUrl(frontHeight: number = DEFAULT_FRONT): string {
  return "data:image/svg+xml," + encodeURIComponent(stairTileSvg(stairStyle(frontHeight)));
}

/** The default stair tile as a data URL, ready to load into an Image. */
export const STAIR_TILE = stairTileUrl(DEFAULT_FRONT);
