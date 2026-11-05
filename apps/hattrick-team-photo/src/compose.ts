import type { RenderOutput } from "hattrick-player-renderer";
import type { Layout, LayoutOptions } from "./layout.js";

export function naturalSize(c: RenderOutput): { w: number; h: number } {
  return c instanceof HTMLCanvasElement
    ? { w: c.width, h: c.height }
    : { w: c.naturalWidth, h: c.naturalHeight };
}

/**
 * Paints an optional background then each rendered figure canvas onto a single
 * export canvas at its laid-out position (placements are back-to-front, so later
 * rows overlap earlier ones correctly).
 *
 * Figures render at different native sizes per body type, so each is scaled
 * uniformly to the common figure height and centered in its slot. Scaling to a
 * fixed width and height instead would squeeze figures whose aspect differs.
 */
export function composeTeamPhoto(
  canvases: Array<RenderOutput | null>,
  layout: Layout,
  opts: LayoutOptions,
  background: HTMLImageElement | null = null,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, layout.width);
  out.height = Math.max(1, layout.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");

  if (background && background.naturalWidth > 0) {
    // Cover the whole canvas, centered, preserving aspect ratio.
    const scale = Math.max(out.width / background.naturalWidth, out.height / background.naturalHeight);
    const dw = background.naturalWidth * scale;
    const dh = background.naturalHeight * scale;
    ctx.drawImage(background, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  }

  for (const p of layout.placements) {
    const canvas = canvases[p.index];
    if (!canvas) continue;
    const { w: natW, h: natH } = naturalSize(canvas);
    if (natW > 0 && natH > 0) {
      // Uniform scale to the slot height; keep aspect; center within the slot.
      const scale = opts.figureHeight / natH;
      const w = natW * scale;
      ctx.drawImage(canvas, p.x + (opts.figureWidth - w) / 2, p.y, w, opts.figureHeight);
    } else {
      ctx.drawImage(canvas, p.x, p.y, opts.figureWidth, opts.figureHeight);
    }
  }
  return out;
}
