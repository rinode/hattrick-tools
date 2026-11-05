import { describe, expect, it } from "vitest";
import { HattrickClient } from "../src/client.js";
import type { FetchLike } from "../src/transport.js";

const CREDS = {
  consumerKey: "ck",
  consumerSecret: "cs",
  accessToken: "at",
  accessSecret: "as",
};

interface Call {
  url: string;
  method: string;
  body?: string;
}

/** A fake transport that records calls and returns a minimal valid CHPP doc
 *  whose FileName matches the requested `file` query param. */
function recorder(bodyByFile: Record<string, string> = {}): { calls: Call[]; fetch: FetchLike } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body });
    const file = new URL(url).searchParams.get("file") ?? "";
    const inner = bodyByFile[file] ?? "";
    const xml = `<?xml version="1.0"?><HattrickData><FileName>${file}.xml</FileName><Version>1.0</Version>${inner}</HattrickData>`;
    return { ok: true, status: 200, text: async () => xml };
  };
  return { calls, fetch };
}

describe("setMatchOrders", () => {
  it("POSTs the lineup in the body and parses the returned orders", async () => {
    const { calls, fetch } = recorder({
      matchorders: `<MatchData Available="true" OrdersSet="true"><Lineup/></MatchData>`,
    });
    const client = new HattrickClient(CREDS, fetch);
    const res = await client.setMatchOrders(500, 7, '{"positions":[]}');
    expect(res.ordersSet).toBe(true);

    const call = calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.body).toContain("lineup=");
    const u = new URL(call.url);
    expect(u.searchParams.get("file")).toBe("matchorders");
    expect(u.searchParams.get("actionType")).toBe("setmatchorder");
    expect(u.searchParams.get("matchID")).toBe("500");
    expect(u.searchParams.get("teamId")).toBe("7");
  });
});

describe("predictRatings", () => {
  it("POSTs with actionType=predictratings", async () => {
    const { calls, fetch } = recorder({ matchorders: `<MatchData><Lineup/></MatchData>` });
    const client = new HattrickClient(CREDS, fetch);
    await client.predictRatings(500, 7, "{}");
    expect(new URL(calls[0]!.url).searchParams.get("actionType")).toBe("predictratings");
    expect(calls[0]!.method).toBe("POST");
  });
});

describe("placeBid", () => {
  it("sends actionType=placeBid with the amounts", async () => {
    const { calls, fetch } = recorder({
      playerdetails: `<Player><PlayerID>42</PlayerID></Player>`,
    });
    const client = new HattrickClient(CREDS, fetch);
    const p = await client.placeBid(42, 7, 100000, 150000);
    expect(p.id).toBe(42);
    const u = new URL(calls[0]!.url);
    expect(u.searchParams.get("actionType")).toBe("placeBid");
    expect(u.searchParams.get("bidAmount")).toBe("100000");
    expect(u.searchParams.get("maxBidAmount")).toBe("150000");
  });
});

describe("ignoreTransfer / deleteAllFinishedBids", () => {
  it("builds the currentbids action params", async () => {
    const { calls, fetch } = recorder();
    const client = new HattrickClient(CREDS, fetch);
    await client.ignoreTransfer(1234, 5);
    await client.deleteAllFinishedBids();
    expect(new URL(calls[0]!.url).searchParams.get("actionType")).toBe("ignoreTransfer");
    expect(new URL(calls[0]!.url).searchParams.get("transferId")).toBe("1234");
    expect(new URL(calls[1]!.url).searchParams.get("actionType")).toBe("deleteAllFinished");
  });
});

describe("challenges write", () => {
  it("challenge sends opponent, type and place; accept sends the match id", async () => {
    const { calls, fetch } = recorder();
    const client = new HattrickClient(CREDS, fetch);
    await client.challenge(8, 1, 2, { neutralArenaId: 99, weekend: true });
    await client.acceptChallenge(321);
    const c0 = new URL(calls[0]!.url).searchParams;
    expect(c0.get("actionType")).toBe("challenge");
    expect(c0.get("opponentTeamId")).toBe("8");
    expect(c0.get("matchPlace")).toBe("2");
    expect(c0.get("neutralArenaId")).toBe("99");
    expect(c0.get("isWeekendFriendly")).toBe("1");
    expect(new URL(calls[1]!.url).searchParams.get("actionType")).toBe("accept");
    expect(new URL(calls[1]!.url).searchParams.get("trainingMatchId")).toBe("321");
  });
});

describe("live write", () => {
  it("addLiveMatch and clearLiveMatches set the right actionType", async () => {
    const { calls, fetch } = recorder();
    const client = new HattrickClient(CREDS, fetch);
    await client.addLiveMatch(500, { useLiveEventsAndTexts: true });
    await client.clearLiveMatches();
    const a = new URL(calls[0]!.url).searchParams;
    expect(a.get("actionType")).toBe("addMatch");
    expect(a.get("matchID")).toBe("500");
    expect(a.get("useLiveEventsAndTexts")).toBe("true");
    expect(new URL(calls[1]!.url).searchParams.get("actionType")).toBe("clearAll");
  });
});

describe("unlockYouthPlayerSkills", () => {
  it("sends actionType=unlockskills with the player id", async () => {
    const { calls, fetch } = recorder({
      youthplayerdetails: `<YouthPlayer><YouthPlayerID>77</YouthPlayerID></YouthPlayer>`,
    });
    const client = new HattrickClient(CREDS, fetch);
    const y = await client.unlockYouthPlayerSkills(77, { showLastMatch: true });
    expect(y.id).toBe(77);
    const u = new URL(calls[0]!.url).searchParams;
    expect(u.get("actionType")).toBe("unlockskills");
    expect(u.get("youthPlayerId")).toBe("77");
    expect(u.get("showLastMatch")).toBe("true");
  });
});
