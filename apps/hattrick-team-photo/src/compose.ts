import type { RenderOutput } from "hattrick-player-renderer";
import type { Layout, LayoutOptions } from "./layout.js";

/**
 * Paints each rendered figure canvas onto a single export canvas at its
 * laid-out position (placements are back-to-front, so later rows overlap
 * earlier ones correctly).
 */
export function composeTeamPhoto(
  canvases: Array<RenderOutput | null>,
  layout: Layout,
  opts: LayoutOptions,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, layout.width);
  out.height = Math.max(1, layout.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");

  for (const p of layout.placements) {
    const canvas = canvases[p.index];
    if (canvas) ctx.drawImage(canvas, p.x, p.y, opts.figureWidth, opts.figureHeight);
  }
  return out;
}
