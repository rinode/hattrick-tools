/** One positioned head-overlay part of the figure. */
export interface AvatarPart {
  url: string;
  x: number;
  y: number;
}

/**
 * The eleven inputs Hattrick's `HT.FullBodies.init(...)` takes, as parsed
 * from a player page. These fully describe a full-body figure; most derive
 * from CHPP, but skinColor / neckPosition / hairOffset* are page-only.
 */
export interface RenderInputs {
  /** Head-overlay parts (faces/eyes/nose/mouth/hair). */
  faceElements: AvatarPart[];
  /** Base path for the full-body asset tree. */
  assetsPath: string;
  /** UV triangle mesh JSON for this body type. */
  meshPath: string;
  /** Outline SVG for this body type. */
  outlinePath: string;
  /** Body type, 1–12. */
  bodyType: number;
  /** Team kit data JSON (colours, pattern, crest). */
  kitJson: string;
  /** Output width in pixels. */
  width: number;
  /** Skin tone as a CSS hex colour (page-only; not in CHPP). */
  skinColor: string;
  /** Where the head attaches on the body (page-only). */
  neckPosition: number;
  hairOffsetX: number;
  hairOffsetY: number;
}
