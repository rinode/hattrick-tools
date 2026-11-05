/** Options for arranging figures into staggered team-photo rows. */
export interface LayoutOptions {
  /** Number of rows to spread the figures across. */
  rows: number;
  figureWidth: number;
  figureHeight: number;
  /** Horizontal gap between figures in a row. */
  gapX: number;
  /** Vertical drop from one row to the next (front rows sit lower). */
  rowRise: number;
  /** Offset alternate rows by half a figure so rows interleave. */
  stagger: boolean;
}

export interface Placement {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  /** Width this figure is drawn at (figures are packed adjacent by width). */
  w: number;
}

export interface Layout {
  width: number;
  height: number;
  rowCounts: number[];
  placements: Placement[];
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  rows: 3,
  figureWidth: 111,
  figureHeight: 409,
  gapX: 8,
  rowRise: 90,
  stagger: true,
};

/** Distributes `count` figures across `rows` rows as evenly as possible. */
function distribute(count: number, rows: number): number[] {
  const r = Math.min(Math.max(1, rows), Math.max(1, count));
  const base = Math.floor(count / r);
  let rem = count % r;
  const counts: number[] = [];
  for (let i = 0; i < r; i++) {
    counts.push(base + (rem > 0 ? 1 : 0));
    if (rem > 0) rem--;
  }
  return counts;
}

/**
 * Computes positions for `count` figures arranged into staggered rows, back
 * row first (row 0 is highest/furthest back). Pure — no DOM — so it's unit
 * tested; the compositor just paints each figure at the returned (x, y).
 */
export function computeLayout(
  countOrWidths: number | number[],
  opts: LayoutOptions = DEFAULT_LAYOUT,
): Layout {
  // A plain count lays figures out at the uniform figure width; an array of
  // per-figure widths packs each figure at its own width, adjacent to the next.
  const widths =
    typeof countOrWidths === "number"
      ? (Array(Math.max(0, countOrWidths)).fill(opts.figureWidth) as number[])
      : countOrWidths;
  const count = widths.length;
  if (count <= 0) return { width: 0, height: 0, rowCounts: [], placements: [] };

  const rowCounts = distribute(count, opts.rows);
  const avgW = widths.reduce((a, b) => a + b, 0) / count;
  const staggerShift = opts.stagger ? avgW / 2 : 0;

  // Split the widths into rows following rowCounts.
  const rowWidths: number[][] = [];
  let cursor = 0;
  for (const n of rowCounts) {
    rowWidths.push(widths.slice(cursor, cursor + n));
    cursor += n;
  }
  const rowSpan = (ws: number[]) => ws.reduce((a, b) => a + b, 0) + Math.max(0, ws.length - 1) * opts.gapX;
  const totalWidth =
    Math.max(...rowWidths.map((ws, r) => rowSpan(ws) + (r % 2 ? staggerShift : 0))) || 0;

  const placements: Placement[] = [];
  let index = 0;
  rowWidths.forEach((ws, row) => {
    const offset = row % 2 ? staggerShift : 0;
    let x = (totalWidth - rowSpan(ws) - offset) / 2 + offset;
    ws.forEach((w, col) => {
      placements.push({ index: index++, row, col, x: Math.round(x), y: row * opts.rowRise, w });
      x += w + opts.gapX;
    });
  });

  const height = (rowCounts.length - 1) * opts.rowRise + opts.figureHeight;
  return { width: Math.ceil(totalWidth), height, rowCounts, placements };
}
