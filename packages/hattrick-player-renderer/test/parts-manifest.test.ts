import { describe, expect, it } from "vitest";
import { AVATAR_PARTS, facePartNumbers, partOffset } from "../src/parts-manifest.js";

describe("avatar-parts manifest", () => {
  it("carries both genders with the expected face shapes", () => {
    expect(Object.keys(AVATAR_PARTS.m).sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(Object.keys(AVATAR_PARTS.f).sort()).toEqual(["4", "5", "6", "7", "8", "9"]);
  });

  it("lists part numbers per shape and category", () => {
    const eyes = facePartNumbers("m", 1, "e");
    expect(eyes).toContain(1);
    expect(eyes).toEqual([...eyes].sort((a, b) => a - b));
    // Female eyes live at a disjoint, higher number range.
    expect(facePartNumbers("f", 5, "e").every((n) => n >= 31)).toBe(true);
    expect(facePartNumbers(2, 5, "g")).toEqual([]); // GenderID 2 = female, no goatees
  });

  it("returns the real per-shape offset, accepting a number or a filename", () => {
    const n = facePartNumbers("m", 1, "e")[0]!;
    const byNum = partOffset("m", 1, "e", n);
    expect(byNum).toBeDefined();
    expect(partOffset("m", 1, "e", `e${n}b.png`)).toEqual(byNum);
    // Offsets differ across face shapes for the same part number.
    expect(partOffset("m", 1, "m", 1)).not.toEqual(partOffset("m", 5, "m", 1));
    // Missing entry → undefined (caller falls back).
    expect(partOffset("m", 1, "e", 999)).toBeUndefined();
  });
});
