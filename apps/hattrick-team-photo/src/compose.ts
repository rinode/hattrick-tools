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
  /** Squad members listed under the photo (empty to hide). */
  members?: { number: number; name: string }[];
}

const SIDE = 24;
const HEADER_H = 76;
const LINE_H = 24;
const FOOTER_PAD = 20;
const MIN_WIDTH = 560;
const INK = "#1b2420";

function withHalo(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = INK;
  draw();
  ctx.restore();
}

/**
 * Paints the photo: an optional header (team name + crest), the figures, and an
 * optional footer listing the squad. Figures scale to a common height and pack
 * adjacent; the canvas grows to fit whatever header/footer are shown.
 */
export function composeTeamPhoto(
  canvases: Array<RenderOutput | null>,
  layout: Layout,
  opts: LayoutOptions,
  background: HTMLImageElement | null = null,
  meta: PhotoMeta = {},
): HTMLCanvasElement {
  const hasCrest = Boolean(meta.crest && meta.crest.naturalWidth > 0);
  const hasHeader = Boolean((meta.teamName && meta.teamName.trim()) || hasCrest);
  const members = meta.members ?? [];
  const cols = members.length ? Math.min(4, Math.ceil(members.length / 11)) : 0;
  const perCol = cols ? Math.ceil(members.length / cols) : 0;

  const headerH = hasHeader ? HEADER_H : 0;
  const footerH = members.length ? FOOTER_PAD * 2 + perCol * LINE_H : 0;
  const width = Math.max(layout.width, MIN_WIDTH);

  const out = document.createElement("canvas");
  out.width = Math.ceil(width);
  out.height = Math.max(1, headerH + layout.height + footerH);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");

  if (background && background.naturalWidth > 0) {
    const scale = Math.max(out.width / background.naturalWidth, out.height / background.naturalHeight);
    const dw = background.naturalWidth * scale;
    const dh = background.naturalHeight * scale;
    ctx.drawImage(background, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  }

  // Header: team name centered, crest against the right edge.
  if (hasHeader) {
    if (meta.teamName && meta.teamName.trim()) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '700 34px "Roboto", Verdana, sans-serif';
      withHalo(ctx, () => ctx.fillText(meta.teamName!.trim(), out.width / 2, headerH / 2));
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
    if (canvas) ctx.drawImage(canvas, p.x + offsetX, p.y + headerH, p.w, opts.figureHeight);
  }

  // Footer: numbered squad list in columns.
  if (members.length) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = '500 15px "Roboto", Verdana, sans-serif';
    const top = headerH + layout.height + FOOTER_PAD;
    const colW = out.width / cols;
    members.forEach((m, i) => {
      const col = Math.floor(i / perCol);
      const rowInCol = i % perCol;
      const x = col * colW + SIDE;
      const y = top + rowInCol * LINE_H + LINE_H / 2;
      withHalo(ctx, () => ctx.fillText(`${m.number}. ${m.name}`, x, y));
    });
  }

  return out;
}
