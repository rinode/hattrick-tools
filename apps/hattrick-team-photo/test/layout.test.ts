import { describe, expect, it } from "vitest";
import { computeLayout, DEFAULT_LAYOUT } from "../src/layout.js";

describe("computeLayout", () => {
  it("is empty for zero figures", () => {
    expect(computeLayout(0)).toEqual({ width: 0, height: 0, rowCounts: [], placements: [] });
  });

  it("distributes evenly across the requested rows", () => {
    const l = computeLayout(11, { ...DEFAULT_LAYOUT, rows: 3, maxPerRow: 6 });
    expect(l.rowCounts).toEqual([4, 4, 3]);
    expect(l.placements).toHaveLength(11);
    expect(l.rowCounts.reduce((a, b) => a + b, 0)).toBe(11);
  });

  it("adds rows when maxPerRow would be exceeded", () => {
    const l = computeLayout(20, { ...DEFAULT_LAYOUT, rows: 2, maxPerRow: 6 });
    expect(l.rowCounts).toHaveLength(4); // ceil(20/6) = 4 > 2
    expect(Math.max(...l.rowCounts)).toBeLessThanOrEqual(6);
    expect(l.rowCounts.reduce((a, b) => a + b, 0)).toBe(20);
  });

  it("places back rows higher than front rows and keeps everything on-canvas", () => {
    const l = computeLayout(9, DEFAULT_LAYOUT);
    const backRow = l.placements.filter((p) => p.row === 0);
    const frontRow = l.placements.filter((p) => p.row === l.rowCounts.length - 1);
    expect(backRow[0]!.y).toBeLessThan(frontRow[0]!.y);
    for (const p of l.placements) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + DEFAULT_LAYOUT.figureWidth).toBeLessThanOrEqual(l.width + 1);
      expect(p.y + DEFAULT_LAYOUT.figureHeight).toBeLessThanOrEqual(l.height + 1);
    }
  });

  it("staggers alternate rows horizontally", () => {
    const l = computeLayout(12, { ...DEFAULT_LAYOUT, rows: 2, maxPerRow: 6, stagger: true });
    const row0First = l.placements.find((p) => p.row === 0 && p.col === 0)!;
    const row1First = l.placements.find((p) => p.row === 1 && p.col === 0)!;
    expect(row0First.x).not.toBe(row1First.x);
  });
});
