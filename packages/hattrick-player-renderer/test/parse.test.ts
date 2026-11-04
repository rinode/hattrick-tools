import { describe, expect, it } from "vitest";
import { extractInitArgs, parseInitArgs, splitTopLevel } from "../src/parse.js";
import { absolutize } from "../src/browser.js";

// A realistic fragment of a player page, with the init call embedded in
// surrounding script noise and followed by the render() call. These are the
// exact argument shapes reverse-engineered from player 517305147 (body 10).
const PAGE = `
<script>
  jQuery(function () {
    HT.FullBodies.init([{"url":"faces/f9a.png","x":9,"y":10},{"url":"eyes/e10a.png","x":21,"y":17},{"url":"hair/f9h3e.png","x":9,"y":10}], "/Club/Players/Avatars/fullbody_assets", "/Club/Players/Avatars/fullbody_assets/uvs_m/kit_10_tri.json", "/Club/Players/Avatars/fullbody_assets/outlines_vector_m/full_body_kit_10.svg", 10, "//res.hattrick.org/kits/35/342/3420/3419013/kitData.json", 240, "#eccaba", 87, 0, 0);
    HT.FullBodies.render("ctl00_ctl00_CPContent_CPMain_ucPlayerBody_pnlFullBodyAvatar");
  });
</script>`;

describe("extractInitArgs / splitTopLevel", () => {
  it("splits on top-level commas, not those inside the array", () => {
    const args = splitTopLevel(extractInitArgs(PAGE));
    expect(args).toHaveLength(11);
    expect(args[4]).toBe("10");
    expect(args[7]).toBe('"#eccaba"');
  });
});

describe("parseInitArgs", () => {
  const inputs = parseInitArgs(PAGE);

  it("parses the head-overlay parts array", () => {
    expect(inputs.faceElements).toEqual([
      { url: "faces/f9a.png", x: 9, y: 10 },
      { url: "eyes/e10a.png", x: 21, y: 17 },
      { url: "hair/f9h3e.png", x: 9, y: 10 },
    ]);
  });

  it("parses the scalar inputs, including the page-only ones", () => {
    expect(inputs.bodyType).toBe(10);
    expect(inputs.meshPath).toBe("/Club/Players/Avatars/fullbody_assets/uvs_m/kit_10_tri.json");
    expect(inputs.kitJson).toBe("//res.hattrick.org/kits/35/342/3420/3419013/kitData.json");
    expect(inputs.width).toBe(240);
    expect(inputs.skinColor).toBe("#eccaba");
    expect(inputs.neckPosition).toBe(87);
    expect(inputs.hairOffsetX).toBe(0);
    expect(inputs.hairOffsetY).toBe(0);
  });

  it("tolerates bareword keys and single quotes", () => {
    const js = `HT.FullBodies.init([{url:'faces/f1.png',x:1,y:2}], "a","m","o",3,"k",240,"#fff",80,0,0)`;
    expect(parseInitArgs(js).faceElements).toEqual([{ url: "faces/f1.png", x: 1, y: 2 }]);
  });

  it("throws when the init call is absent", () => {
    expect(() => parseInitArgs("<html>no renderer here</html>")).toThrow(/not found/);
  });
});

describe("absolutize (cross-origin asset resolution)", () => {
  it("prefixes relative paths and fixes protocol-relative urls", () => {
    expect(absolutize("/Club/x.svg", "https://www.hattrick.org")).toBe(
      "https://www.hattrick.org/Club/x.svg",
    );
    expect(absolutize("//res.hattrick.org/k.json", "https://www.hattrick.org")).toBe(
      "https://res.hattrick.org/k.json",
    );
    expect(absolutize("https://x/y.png", "https://www.hattrick.org")).toBe("https://x/y.png");
  });
});
