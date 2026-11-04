/** Options for arranging figures into staggered team-photo rows. */
export interface LayoutOptions {
  /** Desired number of rows (expanded if maxPerRow forces more). */
  rows: number;
  /** Maximum figures per row. */
  maxPerRow: number;
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
}

export interface Layout {
  width: number;
  height: number;
  rowCounts: number[];
  placements: Placement[];
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  rows: 3,
  maxPerRow: 6,
  figureWidth: 111,
  figureHeight: 409,
  gapX: 8,
  rowRise: 90,
  stagger: true,
};

/** Distributes `count` figures across rows as evenly as possible. */
function distribute(count: number, rows: number, maxPerRow: number): number[] {
  const needed = Math.max(1, Math.ceil(count / Math.max(1, maxPerRow)));
  const r = Math.min(Math.max(rows, needed), Math.max(1, count));
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
export function computeLayout(count: number, opts: LayoutOptions = DEFAULT_LAYOUT): Layout {
  if (count <= 0) return { width: 0, height: 0, rowCounts: [], placements: [] };

  const rowCounts = distribute(count, opts.rows, opts.maxPerRow);
  const stride = opts.figureWidth + opts.gapX;
  const staggerShift = opts.stagger ? opts.figureWidth / 2 : 0;

  const rowWidth = (n: number) => n * opts.figureWidth + (n - 1) * opts.gapX;
  const totalWidth =
    Math.max(...rowCounts.map((n, r) => rowWidth(n) + (r % 2 ? staggerShift : 0))) || 0;

  const placements: Placement[] = [];
  let index = 0;
  rowCounts.forEach((n, row) => {
    const offset = row % 2 ? staggerShift : 0;
    const startX = (totalWidth - rowWidth(n) - offset) / 2 + offset;
    for (let col = 0; col < n; col++) {
      placements.push({
        index: index++,
        row,
        col,
        x: Math.round(startX + col * stride),
        y: row * opts.rowRise,
      });
    }
  });

  const height = (rowCounts.length - 1) * opts.rowRise + opts.figureHeight;
  return { width: Math.ceil(totalWidth), height, rowCounts, placements };
}
