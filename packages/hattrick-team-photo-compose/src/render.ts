import {
  renderInputs,
  type RendererOptions,
  type RenderInputs,
  type RenderOutput,
} from "hattrick-player-renderer";
import { computeLayout, DEFAULT_LAYOUT, type LayoutOptions } from "./layout.js";
import { composeTeamPhoto, naturalSize, type PhotoMeta } from "./compose.js";
import { DEFAULT_FRONT, stairRowRise, stairTileUrl, type StairColors } from "./stairs.js";

/** One figure in the photo: its parsed render inputs plus footer label. */
export interface TeamPhotoMember {
  /** Parsed inputs for the figure (see renderInputsFromAvatar). */
  inputs: RenderInputs;
  /** Shirt number shown in the footer (0 or undefined hides it). */
  number?: number;
  /** Name shown in the footer. */
  name?: string;
}

/** Stair-floor options; set `show: false` to omit the floor entirely. */
export interface StairOptions extends StairColors {
  show?: boolean;
  /** Front-face height; also drives the spacing between rows. */
  frontHeight?: number;
}

export interface TeamPhotoOptions {
  /** Renderer config (asset origin + script URLs) passed to every figure. */
  engine?: RendererOptions;
  /** Row layout; merged over DEFAULT_LAYOUT. `rowRise` is set from the stairs. */
  layout?: Partial<LayoutOptions>;
  /** Stair floor; omit or `{ show: false }` to leave it out. */
  stairs?: StairOptions;
  /** Header/footer text, colours, crest and badge (both already-loaded images). */
  meta?: PhotoMeta;
  /** Background image, already loaded. */
  background?: HTMLImageElement | null;
  /** Draw the name footer. Default true. Ignored if `meta.members` is set. */
  showNames?: boolean;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

/**
 * Renders a complete team photo from parsed player inputs. Draws each figure
 * with hattrick-player-renderer off-screen, builds the stair floor, and
 * composes the header, figures, stairs and name footer into a single canvas.
 *
 * Framework-agnostic: pair it with any UI, or none. A figure that fails to
 * render is skipped (its slot is left empty) rather than failing the whole
 * photo. The browser must be able to fetch the renderer's assets from
 * `engine.assetOrigin` (see hattrick-player-renderer for the CORS note).
 */
export async function renderTeamPhoto(
  members: TeamPhotoMember[],
  options: TeamPhotoOptions = {},
): Promise<HTMLCanvasElement> {
  const stairs = options.stairs ?? {};
  const showStairs = stairs.show !== false;
  const frontHeight = stairs.frontHeight ?? DEFAULT_FRONT;
  const layoutOpts: LayoutOptions = { ...DEFAULT_LAYOUT, ...options.layout };
  if (showStairs) layoutOpts.rowRise = stairRowRise(frontHeight);

  // Render every figure off-screen; a failure leaves an empty slot.
  const temp = document.createElement("div");
  temp.style.cssText = "position:absolute;left:-9999px;top:0";
  document.body.appendChild(temp);
  const outputs: Array<RenderOutput | null> = [];
  try {
    for (const m of members) {
      const holder = document.createElement("div");
      temp.appendChild(holder);
      try {
        outputs.push(await renderInputs(m.inputs, holder, options.engine ?? {}));
      } catch {
        outputs.push(null);
      }
    }
  } finally {
    temp.remove();
  }

  // Scale each figure to the shared height; pack rows by actual width.
  const widths = outputs.map((c) => {
    if (!c) return layoutOpts.figureWidth;
    const { w, h } = naturalSize(c);
    return h > 0 ? w * (layoutOpts.figureHeight / h) : layoutOpts.figureWidth;
  });
  const layout = computeLayout(widths, layoutOpts);

  const stairsImg = showStairs
    ? await loadImage(stairTileUrl(frontHeight, { top: stairs.top, front: stairs.front }))
    : null;

  const footer =
    options.showNames === false
      ? []
      : members.map((m) => ({ number: m.number ?? 0, name: m.name ?? "" }));
  const meta: PhotoMeta = { ...options.meta, members: options.meta?.members ?? footer };

  return composeTeamPhoto(outputs, layout, layoutOpts, options.background ?? null, meta, stairsImg);
}
