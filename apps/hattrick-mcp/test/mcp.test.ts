import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { FetchLike } from "hattrick-chpp-node";
import { buildServer } from "../src/server.js";
import { humanizeEconomy, humanizePlayer } from "../src/humanize.js";
import { TtlCache } from "../src/cache.js";

const CREDS = { consumerKey: "ck", consumerSecret: "cs", accessToken: "at", accessSecret: "as" };

const PLAYERS_XML = `<HattrickData><FileName>players.xml</FileName>
  <Team><TeamID>3486754</TeamID><TeamName>Op Buuren</TeamName><PlayerList>
    <Player><PlayerID>1</PlayerID><FirstName>Jan</FirstName><LastName>Toorn</LastName>
      <PlayerForm>8</PlayerForm><Specialty>1</Specialty><Salary>130000</Salary><PlaymakerSkill>8</PlaymakerSkill>
    </Player>
  </PlayerList></Team></HattrickData>`;

const fetchPlayers: FetchLike = async (url) => ({
  ok: true,
  status: 200,
  text: async () => (url.includes("file=players") ? PLAYERS_XML : "<HattrickData/>"),
});

describe("humanize", () => {
  it("denominates skills and shows EUR salary, dropping zeros", () => {
    const h = humanizePlayer({
      id: 1,
      firstName: "Jan",
      nickName: "",
      lastName: "Toorn",
      number: 0,
      age: 28,
      ageDays: 12,
      tsi: 5400,
      form: 8,
      experience: 0,
      loyalty: 0,
      motherClubBonus: false,
      leadership: 0,
      salarySek: 130000,
      isAbroad: false,
      specialtyId: 1,
      transferListed: false,
      countryId: 0,
      cards: 0,
      injuryLevel: 0,
      staminaSkill: 0,
      keeperSkill: 0,
      playmakerSkill: 8,
      scorerSkill: 0,
      passingSkill: 0,
      wingerSkill: 0,
      defenderSkill: 0,
      setPiecesSkill: 0,
      categoryId: 0,
    });
    expect(h.name).toBe("Jan Toorn");
    expect(h.form).toBe("excellent (8)");
    expect(h.playmaking).toBe("excellent (8)");
    expect(h.specialty).toBe("Technical");
    expect(h.salary).toBe("€13,000"); // 130,000 SEK — not €130,000
    expect(h.number).toBeUndefined(); // zero dropped
    expect(h.age).toBe("28 years 12 days");
  });

  it("formats economy in EUR", () => {
    const e = humanizeEconomy({
      teamId: 1,
      teamName: "Op Buuren",
      cashSek: 500000,
      expectedCashSek: 540000,
      incomeSumSek: 120000,
      costsSumSek: 80000,
      costsPlayerSek: 30000,
      costsStaffSek: 40800,
      costsArenaSek: 5000,
      costsYouthSek: 0,
      expectedWeeksTotalSek: 40000,
      lastIncomeSumSek: 110000,
      lastCostsSumSek: 70000,
      lastWeeksTotalSek: 40000,
    });
    expect(e.cash).toBe("€50,000");
    expect((e.thisWeek as Record<string, string>).staffWages).toBe("€4,080");
  });
});

describe("TtlCache", () => {
  it("caches within the TTL and reloads after expiry", async () => {
    let calls = 0;
    const cache = new TtlCache(1000);
    const load = async () => ++calls;
    expect(await cache.get("k", load)).toBe(1);
    expect(await cache.get("k", load)).toBe(1); // cached
    cache.clear();
    expect(await cache.get("k", load)).toBe(2); // reloaded
  });
});

describe("MCP server (in-memory client)", () => {
  it("registers the read tools and serves get_players", async () => {
    const server = buildServer(CREDS, { fetchImpl: fetchPlayers });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: "test", version: "0" });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      "get_avatars",
      "get_economy",
      "get_players",
      "get_team",
      "get_training",
    ]);

    const res = await client.callTool({ name: "get_players", arguments: {} });
    const content = res.content as Array<{ type: string; text: string }>;
    const payload = JSON.parse(content[0]!.text) as { teamName: string; players: unknown[] };
    expect(payload.teamName).toBe("Op Buuren");
    expect((payload.players[0] as { salary: string }).salary).toBe("€13,000");

    await client.close();
    await server.close();
  });
});
