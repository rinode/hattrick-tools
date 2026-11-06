import type { RenderOutput } from "hattrick-player-renderer";
import type { Layout, LayoutOptions } from "./layout.js";

export function naturalSize(c: RenderOutput): { w: number; h: number } {
  return c instanceof HTMLCanvasElement
    ? { w: c.width, h: c.height }
    : { w: c.naturalWidth, h: c.naturalHeight };
}

export interface PhotoMeta {
  /** Team name drawn big and centered in the header (omit/empty to hide). */
  teamName?: string;
  /** Team crest drawn against the right edge of the header (null to hide). */
  crest?: HTMLImageElement | null;
  /** Squad members, in figure order, listed under the photo row by row. */
  members?: { number: number; name: string }[];
}

const SIDE = 24;
const HEADER_H = 76;
const LINE_H = 26;
const FOOTER_PAD = 18;
const NAME_GAP = 28;
const MIN_WIDTH = 560;
// Each row's feet sit this far below the stair tile's top, centering them in the
// grey top surface so there is tread both in front of and behind the feet.
const STAIR_ABOVE_FEET = 32;
// Drop figures slightly so their rendered shadow rests on the step.
const FIGURE_DROP = 10;

// All text is white with a black drop shadow so it reads over any background.
function withShadow(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#ffffff";
  draw();
  ctx.restore();
}

/**
 * Paints the photo: an optional header (team name + crest), the figures, and an
 * optional footer listing the squad row by row (each figure row's names on one
 * centered line). Figures scale to a common height and pack adjacent.
 */
export function composeTeamPhoto(
  canvases: Array<RenderOutput | null>,
  layout: Layout,
  opts: LayoutOptions,
  background: HTMLImageElement | null = null,
  meta: PhotoMeta = {},
  stairs: HTMLImageElement | null = null,
): HTMLCanvasElement {
  const hasCrest = Boolean(meta.crest && meta.crest.naturalWidth > 0);
  const hasHeader = Boolean((meta.teamName && meta.teamName.trim()) || hasCrest);
  const members = meta.members ?? [];

  const hasStairs = Boolean(stairs && stairs.naturalWidth > 0);
  const stairW = hasStairs ? stairs!.naturalWidth : 0;
  const stairH = hasStairs ? stairs!.naturalHeight : 0;
  // The front row's stair extends below that row's feet by this much.
  const stairOverhang = hasStairs ? Math.max(0, stairH - STAIR_ABOVE_FEET) : 0;

  const headerH = hasHeader ? HEADER_H : 0;
  const footerRows = members.length ? layout.rowCounts.length : 0;
  const footerH = footerRows ? FOOTER_PAD * 2 + footerRows * LINE_H : 0;
  const width = Math.max(layout.width, MIN_WIDTH);
  // Space below the last row: the stair overhang, but at least the figure drop.
  const bodyExtra = Math.max(stairOverhang, FIGURE_DROP);

  const out = document.createElement("canvas");
  out.width = Math.ceil(width);
  out.height = Math.max(1, headerH + layout.height + bodyExtra + footerH);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");

  if (background && background.naturalWidth > 0) {
    const scale = Math.max(out.width / background.naturalWidth, out.height / background.naturalHeight);
    const dw = background.naturalWidth * scale;
    const dh = background.naturalHeight * scale;
    ctx.drawImage(background, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  }

  // Stairs: one tiled band per figure row, 30px above that row's feet, drawn
  // back-to-front so the front steps overlap the ones behind (like the figures).
  if (hasStairs) {
    for (let row = 0; row < layout.rowCounts.length; row++) {
      const feetY = headerH + row * opts.rowRise + opts.figureHeight;
      const top = feetY - STAIR_ABOVE_FEET;
      for (let x = 0; x < out.width; x += stairW) {
        ctx.drawImage(stairs!, x, top, stairW, stairH);
      }
    }
  }

  // Header: team name centered, crest against the right edge.
  if (hasHeader) {
    if (meta.teamName && meta.teamName.trim()) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '700 34px "Roboto", Verdana, sans-serif';
      withShadow(ctx, () => ctx.fillText(meta.teamName!.trim(), out.width / 2, headerH / 2));
    }
    if (hasCrest) {
      const crest = meta.crest!;
      const h = HEADER_H - 20;
      const w = crest.naturalWidth * (h / crest.naturalHeight);
      ctx.drawImage(crest, out.width - w - SIDE, (headerH - h) / 2, w, h);
    }
  }

  // Figures, centered horizontally, below the header.
  const offsetX = (out.width - layout.width) / 2;
  for (const p of layout.placements) {
    const canvas = canvases[p.index];
    if (canvas) ctx.drawImage(canvas, p.x + offsetX, p.y + headerH + FIGURE_DROP, p.w, opts.figureHeight);
  }

  // Footer: one centered line of names per figure row, same grouping as above.
  if (footerRows) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = '500 15px "Roboto", Verdana, sans-serif';
    const top = headerH + layout.height + bodyExtra + FOOTER_PAD;
    let idx = 0;
    layout.rowCounts.forEach((n, row) => {
      const tokens = members.slice(idx, idx + n).map((m) => `${m.number}. ${m.name}`);
      idx += n;
      const widths = tokens.map((t) => ctx.measureText(t).width);
      const total = widths.reduce((a, b) => a + b, 0) + NAME_GAP * Math.max(0, tokens.length - 1);
      const y = top + row * LINE_H + LINE_H / 2;
      let x = (out.width - total) / 2;
      tokens.forEach((t, i) => {
        withShadow(ctx, () => ctx.fillText(t, x, y));
        x += widths[i]! + NAME_GAP;
      });
    });
  }

  return out;
}
