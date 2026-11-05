import { describe, expect, it, vi } from "vitest";
import { ChppError } from "../src/errors.js";
import { decodeXml } from "../src/xml.js";
import { mapAvatars, mapPlayers, HattrickClient } from "../src/client.js";
import type { FetchLike } from "../src/transport.js";

const AVATARS_XML = `<?xml version="1.0"?>
<HattrickData>
  <FileName>avatars.xml</FileName>
  <Version>1.1</Version>
  <Team>
    <TeamID>3486754</TeamID>
    <Players>
      <Player>
        <PlayerID>517305147</PlayerID>
        <Avatar>
          <BackgroundImage>/Img/Avatar/backgrounds/card1.png</BackgroundImage>
          <Layer x="9" y="10"><Image>backgrounds/bg_blue.png</Image></Layer>
          <Layer x="21" y="17"><Image>eyes/e10a.png</Image></Layer>
        </Avatar>
      </Player>
    </Players>
  </Team>
</HattrickData>`;

const PLAYERS_XML = `<?xml version="1.0"?>
<HattrickData>
  <FileName>players.xml</FileName>
  <Version>2.8</Version>
  <Team>
    <TeamID>3486754</TeamID>
    <TeamName>Op Buuren</TeamName>
    <PlayerList>
      <Player>
        <PlayerID>517305147</PlayerID>
        <FirstName>Jan</FirstName>
        <LastName>Toorn</LastName>
        <PlayerForm>8</PlayerForm>
        <Specialty>1</Specialty>
        <Salary>130000</Salary>
        <PlaymakerSkill>8</PlaymakerSkill>
        <TransferListed>True</TransferListed>
      </Player>
    </PlayerList>
  </Team>
</HattrickData>`;

describe("mapAvatars", () => {
  it("maps players, background and positioned layers (x/y from attributes)", () => {
    const avatars = mapAvatars(decodeXml(AVATARS_XML, "avatars"));
    expect(avatars).toHaveLength(1);
    expect(avatars[0]!.playerId).toBe(517305147);
    expect(avatars[0]!.avatar.backgroundImage).toBe("/Img/Avatar/backgrounds/card1.png");
    expect(avatars[0]!.avatar.layers).toEqual([
      { image: "backgrounds/bg_blue.png", x: 9, y: 10 },
      { image: "eyes/e10a.png", x: 21, y: 17 },
    ]);
  });
});

describe("mapPlayers", () => {
  it("maps team and player fields", () => {
    const team = mapPlayers(decodeXml(PLAYERS_XML, "players"));
    expect(team.teamName).toBe("Op Buuren");
    expect(team.players[0]!.form).toBe(8);
    expect(team.players[0]!.specialtyId).toBe(1);
    expect(team.players[0]!.salarySek).toBe(130000);
    expect(team.players[0]!.playmakerSkill).toBe(8);
    expect(team.players[0]!.transferListed).toBe(true);
  });
});

describe("decodeXml validation", () => {
  it("throws a ChppError on a non-empty <Error>", () => {
    const xml = `<HattrickData><FileName>avatars.xml</FileName><Error>boom</Error></HattrickData>`;
    expect(() => decodeXml(xml, "avatars")).toThrow(ChppError);
  });
  it("throws on a FileName mismatch", () => {
    const xml = `<HattrickData><FileName>club.xml</FileName></HattrickData>`;
    expect(() => decodeXml(xml, "avatars")).toThrow(/right avatars type/);
  });
});

describe("HattrickClient (mocked transport)", () => {
  it("signs the request and decodes avatars end to end", async () => {
    let seenUrl = "";
    let seenAuth = "";
    const fetchImpl: FetchLike = vi.fn(async (url, init) => {
      seenUrl = url;
      seenAuth = init?.headers?.["Authorization"] ?? "";
      return { ok: true, status: 200, text: async () => AVATARS_XML };
    });

    const client = new HattrickClient(
      { consumerKey: "ck", consumerSecret: "cs", accessToken: "at", accessSecret: "as" },
      fetchImpl,
    );
    const avatars = await client.getMyAvatars();

    expect(avatars[0]!.playerId).toBe(517305147);
    expect(seenUrl).toContain("file=avatars");
    expect(seenUrl).toContain("actionType=players");
    expect(seenAuth.startsWith("OAuth ")).toBe(true);
  });
});
