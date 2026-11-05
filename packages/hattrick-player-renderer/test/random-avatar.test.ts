import { describe, expect, it } from "vitest";
import { randomRenderInputs } from "../src/random-avatar.js";

describe("randomRenderInputs", () => {
  it("builds valid inputs across many RNG values", () => {
    for (let i = 0; i < 200; i++) {
      const seq = [i / 200, (i * 7) % 200 / 200, (i * 13) % 200 / 200, (i * 29) % 200 / 200];
      let k = 0;
      const r = randomRenderInputs({ rng: () => seq[k++ % seq.length]! });

      expect(r.faceElements).toHaveLength(5);
      for (const p of r.faceElements) {
        expect(p.url).toMatch(/^\/Img\/Avatar\/(faces|eyes|mouths|noses|hair)\/[\w.]+\.png$/);
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
      expect(r.bodyType).toBeGreaterThanOrEqual(1);
      expect(r.bodyType).toBeLessThanOrEqual(12);
      expect(r.skinColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(r.kitJson).toBe("/default-kit.json");
    }
  });

  it("honors a provided body type and kit", () => {
    const r = randomRenderInputs({ bodyType: 7, kitJson: "/custom.json", rng: () => 0 });
    expect(r.bodyType).toBe(7);
    expect(r.meshPath).toContain("kit_7_tri.json");
    expect(r.kitJson).toBe("/custom.json");
  });
});
