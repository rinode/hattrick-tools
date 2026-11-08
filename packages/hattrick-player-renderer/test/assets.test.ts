import { describe, expect, it } from "vitest";
import { allVendorPaths, BODY_TYPES, staticAssetPaths } from "../src/assets.js";

describe("static asset manifest", () => {
  it("lists three files per body type (svg, mesh, shape)", () => {
    expect(BODY_TYPES).toHaveLength(13);
    expect(staticAssetPaths()).toHaveLength(39);
    expect(staticAssetPaths()).toContain(
      "/Club/Players/Avatars/fullbody_assets/outlines_vector_m/full_body_kit_10.svg",
    );
    expect(staticAssetPaths()).toContain(
      "/Club/Players/Avatars/fullbody_assets/uvs_m/kit_10_tri.json",
    );
  });

  it("includes the engine bundle in the vendor set", () => {
    const all = allVendorPaths();
    expect(all).toContain("/Club/Players/Avatars/slimkitrender.js");
    expect(all).toContain("/Club/Players/Avatars/HT.FullBodies.js");
    expect(all).toHaveLength(41);
  });
});
