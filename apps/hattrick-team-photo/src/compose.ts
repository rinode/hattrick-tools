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
  /** Solid background colour (CSS), used when no background image is set. */
  bgColor?: string | null;
}

const SIDE = 24;
const HEADER_H = 112;
const LINE_H = 26;
const FOOTER_PAD = 18;
const NAME_GAP = 28;
const MIN_WIDTH = 560;
const HEADER_FONT = '700 52px "Roboto", Verdana, sans-serif';
const FOOTER_FONT = '500 15px "Roboto", Verdana, sans-serif';
// Minimum gap between the team name and the crest before the frame widens.
const HEADER_GAP = 20;
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
  // Space below the last row: the stair overhang, but at least the figure drop.
  const bodyExtra = Math.max(stairOverhang, FIGURE_DROP);

  const out = document.createElement("canvas");
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");

  // Crest size in the header.
  const crestH = HEADER_H - 28;
  const crestW = hasCrest ? meta.crest!.naturalWidth * (crestH / meta.crest!.naturalHeight) : 0;

  // Measure the text so the frame is never too narrow to show it in full. The
  // name stays centered, so reserve the crest's width (plus a gap) on both sides
  // to keep it from overlapping the crest.
  const name = meta.teamName?.trim() ?? "";
  ctx.font = HEADER_FONT;
  const nameW = name ? ctx.measureText(name).width : 0;
  const headerNeed = name
    ? nameW + 2 * SIDE + (hasCrest ? 2 * (crestW + HEADER_GAP) : 0)
    : hasCrest
      ? crestW + 2 * SIDE
      : 0;

  ctx.font = FOOTER_FONT;
  let footerLine = 0;
  if (footerRows) {
    let idx = 0;
    for (const n of layout.rowCounts) {
      const tokens = members
        .slice(idx, idx + n)
        .map((m) => (m.number ? `${m.number}. ${m.name}` : m.name));
      idx += n;
      const line =
        tokens.reduce((a, t) => a + ctx.measureText(t).width, 0) +
        NAME_GAP * Math.max(0, tokens.length - 1);
      footerLine = Math.max(footerLine, line);
    }
  }
  const footerNeed = footerRows ? footerLine + 2 * SIDE : 0;

  // Pad the sides by SIDE so the outer figures never touch the edge; widen
  // further when the header or footer text needs more room.
  const width = Math.max(layout.width + SIDE * 2, headerNeed, footerNeed, MIN_WIDTH);

  out.width = Math.ceil(width);
  out.height = Math.max(1, headerH + layout.height + bodyExtra + footerH);

  if (background && background.naturalWidth > 0) {
    const scale = Math.max(out.width / background.naturalWidth, out.height / background.naturalHeight);
    const dw = background.naturalWidth * scale;
    const dh = background.naturalHeight * scale;
    ctx.drawImage(background, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  } else if (meta.bgColor) {
    ctx.fillStyle = meta.bgColor;
    ctx.fillRect(0, 0, out.width, out.height);
  }

  // Stairs: one tiled band per figure row, drawn back-to-front so the front
  // steps overlap the ones behind (like the figures).
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
    if (name) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = HEADER_FONT;
      withShadow(ctx, () => ctx.fillText(name, out.width / 2, headerH / 2));
    }
    if (hasCrest) {
      ctx.drawImage(meta.crest!, out.width - crestW - SIDE, (headerH - crestH) / 2, crestW, crestH);
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
    ctx.font = FOOTER_FONT;
    const top = headerH + layout.height + bodyExtra + FOOTER_PAD;
    let idx = 0;
    layout.rowCounts.forEach((n, row) => {
      const tokens = members
        .slice(idx, idx + n)
        .map((m) => (m.number ? `${m.number}. ${m.name}` : m.name));
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
