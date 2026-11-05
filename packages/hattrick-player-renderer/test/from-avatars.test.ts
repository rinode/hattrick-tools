import { describe, expect, it } from "vitest";
import { renderInputsFromAvatar, type PlayerAvatar } from "../src/from-avatars.js";

// A real CHPP avatar (player 517305147: face f9a, kit body10).
const AVATAR: PlayerAvatar = {
  backgroundImage: "/Img/Avatar/backgrounds/card1.png",
  layers: [
    { image: "/Img/Avatar/backgrounds/bg_blue.png", x: 9, y: 10 },
    { image: "http://res.hattrick.org/kits/35/342/3420/3419013/body10.png", x: 9, y: 10 },
    { image: "/Img/Avatar/faces/f9a.png", x: 9, y: 10 },
    { image: "/Img/Avatar/eyes/e10a.png", x: 21, y: 17 },
    { image: "/Img/Avatar/mouths/m30a.png", x: 31, y: 64 },
    { image: "/Img/Avatar/noses/n30.png", x: 16, y: 17 },
    { image: "/Img/Avatar/hair/f9h3e.png", x: 9, y: 10 },
    { image: "/Img/Avatar/numbers/1.png", x: 83, y: 130 },
  ],
};

describe("renderInputsFromAvatar", () => {
  it("maps a real avatar to full-body inputs", () => {
    const r = renderInputsFromAvatar(AVATAR, { gender: 1 });

    // Head parts only (no background, kit body or number), order preserved,
    // with the /Img/Avatar/ prefix stripped to the page's relative form.
    expect(r.faceElements).toEqual([
      { url: "faces/f9a.png", x: 9, y: 10 },
      { url: "eyes/e10a.png", x: 21, y: 17 },
      { url: "mouths/m30a.png", x: 31, y: 64 },
      { url: "noses/n30.png", x: 16, y: 17 },
      { url: "hair/f9h3e.png", x: 9, y: 10 },
    ]);

    expect(r.bodyType).toBe(10);
    expect(r.kitJson).toBe("//res.hattrick.org/kits/35/342/3420/3419013/kitData.json");
    expect(r.meshPath).toBe("/Club/Players/Avatars/fullbody_assets/uvs_m/kit_10_tri.json");
    expect(r.outlinePath).toBe(
      "/Club/Players/Avatars/fullbody_assets/outlines_vector_m/full_body_kit_10.svg",
    );
    expect(r.skinColor).toBe("#eccaba"); // tone a
    expect(r.neckPosition).toBe(87); // face shape 9
    expect(r.width).toBe(240);
    expect(r.hairOffsetX).toBe(0);
  });

  it("uses female asset paths for gender 2", () => {
    const r = renderInputsFromAvatar(AVATAR, { gender: 2 });
    expect(r.meshPath).toContain("/uvs_f/");
    expect(r.outlinePath).toContain("/outlines_vector_f/");
  });

  it("resolves dark tones from the completed table", () => {
    const dark: PlayerAvatar = {
      layers: [
        { image: "http://res.hattrick.org/kits/8/77/764/763554/body8.png", x: 9, y: 10 },
        { image: "/Img/Avatar/faces/f8m.png", x: 9, y: 10 },
      ],
    };
    const r = renderInputsFromAvatar(dark);
    expect(r.skinColor).toBe("#fecb98"); // tone m
    expect(r.neckPosition).toBe(80); // face shape 8
    expect(r.bodyType).toBe(8);
  });
});
