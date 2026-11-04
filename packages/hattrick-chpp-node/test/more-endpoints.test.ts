import { describe, expect, it, vi } from "vitest";
import { decodeXml } from "../src/xml.js";
import {
  HattrickClient,
  mapLadderDetails,
  mapLadders,
  mapMatches,
  mapTransferSearch,
} from "../src/client.js";
import type { FetchLike } from "../src/transport.js";

const MATCHES_XML = `<HattrickData><FileName>matches.xml</FileName>
  <Team><TeamID>3486754</TeamID><TeamName>Op Buuren</TeamName><MatchList>
    <Match><MatchID>42753319</MatchID>
      <HomeTeam><HomeTeamID>3486754</HomeTeamID><HomeTeamName>Op Buuren</HomeTeamName></HomeTeam>
      <AwayTeam><AwayTeamID>885947</AwayTeamID><AwayTeamName>AC Brunchy team</AwayTeamName></AwayTeam>
      <MatchDate>2026-11-03 20:28:00</MatchDate><SourceSystem>HTOIntegrated</SourceSystem>
      <MatchType>62</MatchType><MatchContextId>1255256</MatchContextId>
      <HomeGoals>0</HomeGoals><AwayGoals>9</AwayGoals><Status>2</Status></Match>
  </MatchList></Team></HattrickData>`;

const LADDERLIST_XML = `<HattrickData><FileName>ladderlist.xml</FileName><Ladders>
  <Ladder><LadderId>1255256</LadderId><Name>Global</Name><Posistion>24051</Posistion>
    <NextMatchDate>2026-11-03 20:28:00</NextMatchDate><Wins>0</Wins><Lost>1</Lost></Ladder>
</Ladders></HattrickData>`;

const LADDERDETAILS_XML = `<HattrickData><FileName>ladderdetails.xml</FileName><Ladder>
  <LadderId>1255256</LadderId><Name>Global</Name><NumOfTeams>24053</NumOfTeams>
  <PageSize>25</PageSize><PageIndex>962</PageIndex>
  <KingTeamId>1365742</KingTeamId><KingTeamName>Dandy de Tazmania 2</KingTeamName>
  <Team><TeamId>2333307</TeamId><TeamName>S.B.S.</TeamName><Position>24051</Position>
    <Wins>0</Wins><Lost>1</Lost><WinsInARow>0</WinsInARow><LostInARow>1</LostInARow></Team>
</Ladder></HattrickData>`;

const TRANSFER_XML = `<HattrickData><FileName>transfersearch.xml</FileName><TransferSearch>
  <ItemCount>5</ItemCount><PageSize>25</PageSize><PageIndex>0</PageIndex><TransferResults>
    <TransferResult><PlayerId>111</PlayerId><FirstName>Test</FirstName><LastName>Player</LastName>
      <AskingPrice>81000</AskingPrice><Deadline>2026-11-05 12:00:00</Deadline><HighestBid>0</HighestBid>
      <Details><Age>25</Age><AgeDays>10</AgeDays><Salary>15120</Salary><TSI>5400</TSI>
        <PlayerForm>7</PlayerForm><Experience>13</Experience><Specialty>1</Specialty>
        <PlaymakerSkill>8</PlaymakerSkill></Details></TransferResult>
  </TransferResults></TransferSearch></HattrickData>`;

describe("mapMatches", () => {
  it("maps the match list with goals and source system", () => {
    const m = mapMatches(decodeXml(MATCHES_XML, "matches"));
    expect(m.teamName).toBe("Op Buuren");
    expect(m.matches[0]).toMatchObject({
      matchId: 42753319,
      awayTeamName: "AC Brunchy team",
      homeGoals: 0,
      awayGoals: 9,
      status: 2,
      sourceSystem: "HTOIntegrated",
    });
  });
});

describe("mapLadders / mapLadderDetails", () => {
  it("maps ladder list (CHPP's 'Posistion' spelling)", () => {
    const l = mapLadders(decodeXml(LADDERLIST_XML, "ladderlist"));
    expect(l[0]).toMatchObject({ id: 1255256, name: "Global", position: 24051, lost: 1 });
  });
  it("maps ladder details with king and ranking rows", () => {
    const d = mapLadderDetails(decodeXml(LADDERDETAILS_XML, "ladderdetails"));
    expect(d.kingTeamName).toBe("Dandy de Tazmania 2");
    expect(d.numOfTeams).toBe(24053);
    expect(d.teams[0]).toMatchObject({ name: "S.B.S.", position: 24051, lostInARow: 1 });
  });
});

describe("mapTransferSearch", () => {
  it("maps results and nested player details", () => {
    const t = mapTransferSearch(decodeXml(TRANSFER_XML, "transfersearch"));
    expect(t.itemCount).toBe(5);
    expect(t.results[0]).toMatchObject({
      playerId: 111,
      askingPriceSek: 81000,
      age: 25,
      experience: 13,
      playmakerSkill: 8,
    });
  });
});

describe("searchTransfers (query params)", () => {
  it("builds the primary skill filter and price cap into the URL", async () => {
    let seenUrl = "";
    const fetchImpl: FetchLike = vi.fn(async (url) => {
      seenUrl = url;
      return { ok: true, status: 200, text: async () => TRANSFER_XML };
    });
    const client = new HattrickClient(
      { consumerKey: "ck", consumerSecret: "cs", accessToken: "at", accessSecret: "as" },
      fetchImpl,
    );
    const res = await client.searchTransfers({
      ageMin: 21,
      ageMax: 29,
      skillId: 8,
      skillMin: 7,
      skillMax: 11,
      priceMaxSek: 500000,
    });
    expect(res.results[0]!.playerId).toBe(111);
    expect(seenUrl).toContain("file=transfersearch");
    expect(seenUrl).toContain("skillType1=8");
    expect(seenUrl).toContain("minSkillValue1=7");
    expect(seenUrl).toContain("priceMax=500000");
  });
});
