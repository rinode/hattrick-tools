import { describe, expect, it } from "vitest";
import { decodeXml } from "../src/xml.js";
import {
  mapArena,
  mapChallenges,
  mapClub,
  mapCupMatches,
  mapCurrentBids,
  mapFans,
  mapMatchDetails,
  mapMatchLineup,
  mapMatchOrders,
  mapNationalTeamDetails,
  mapPlayerDetails,
  mapSeries,
  mapStaffList,
  mapTranslations,
  mapYouthPlayerDetails,
} from "../src/endpoints.js";

function wrap(file: string, body: string): string {
  return `<?xml version="1.0"?><HattrickData><FileName>${file}.xml</FileName><Version>1.0</Version>${body}</HattrickData>`;
}

describe("club", () => {
  it("parses staff levels and youth squad money", () => {
    const root = decodeXml(
      wrap(
        "club",
        `<Team><TeamID>7</TeamID><TeamName>Op Buuren</TeamName>
         <Staff><MedicLevels>2</MedicLevels><FormCoachLevels>1</FormCoachLevels></Staff>
         <YouthSquad><Investment>130000</Investment><HasPromoted>True</HasPromoted><YouthLevel>3</YouthLevel></YouthSquad>
         </Team>`,
      ),
      "club",
    );
    const c = mapClub(root);
    expect(c.teamId).toBe(7);
    expect(c.staff.medicLevels).toBe(2);
    expect(c.youthSquad.investmentSek).toBe(130000);
    expect(c.youthSquad.hasPromoted).toBe(true);
  });
});

describe("arenadetails", () => {
  it("reads the Available attribute and nested seats", () => {
    const root = decodeXml(
      wrap(
        "arenadetails",
        `<Arena><ArenaID>3483497</ArenaID><ArenaName>Daalseweide</ArenaName>
         <Team><TeamID>7</TeamID><TeamName>Buuren</TeamName></Team>
         <League><LeagueID>14</LeagueID></League>
         <Region><RegionID>327</RegionID></Region>
         <CurrentCapacity Available="true"><RebuiltDate>2026-01-01</RebuiltDate>
           <Terraces>1000</Terraces><Basic>2000</Basic><Roof>500</Roof><VIP>100</VIP><Total>3600</Total></CurrentCapacity>
         <ExpandedCapacity Available="false"/></Arena>`,
      ),
      "arenadetails",
    );
    const a = mapArena(root);
    expect(a.id).toBe(3483497);
    expect(a.currentCapacity.available).toBe(true);
    expect(a.currentCapacity.total).toBe(3600);
    expect(a.expandedCapacity.available).toBe(false);
  });
});

describe("fans", () => {
  it("parses played and upcoming matches", () => {
    const root = decodeXml(
      wrap(
        "fans",
        `<Team><TeamID>7</TeamID><FanClubName>De Buurtjes</FanClubName><Members>512</Members>
         <PlayedMatches><Match><MatchID>1</MatchID><HomeTeam><HomeTeamID>7</HomeTeamID><HomeTeamName>A</HomeTeamName></HomeTeam>
           <AwayTeam><AwayTeamID>8</AwayTeamID><AwayTeamName>B</AwayTeamName></AwayTeam><HomeGoals>2</HomeGoals><AwayGoals>1</AwayGoals></Match></PlayedMatches>
         <UpcomingMatches><Match><MatchID>2</MatchID></Match></UpcomingMatches></Team>`,
      ),
      "fans",
    );
    const f = mapFans(root);
    expect(f.fanClubName).toBe("De Buurtjes");
    expect(f.playedMatches).toHaveLength(1);
    expect(f.playedMatches[0]!.homeGoals).toBe(2);
    expect(f.upcomingMatches[0]!.matchId).toBe(2);
  });
});

describe("stafflist", () => {
  it("parses the trainer and a single staff member (not an array)", () => {
    const root = decodeXml(
      wrap(
        "stafflist",
        `<StaffList><Trainer><TrainerId>99</TrainerId><Name>Coach</Name><Leadership>6</Leadership><TrainerSkillLevel>4</TrainerSkillLevel></Trainer>
         <StaffMembers><Staff><StaffId>1</StaffId><Name>Doc</Name><StaffType>1</StaffType><StaffLevel>3</StaffLevel></Staff></StaffMembers>
         <TotalCost>5000</TotalCost></StaffList>`,
      ),
      "stafflist",
    );
    const s = mapStaffList(root);
    expect(s.trainer.id).toBe(99);
    expect(s.trainer.trainerSkillLevel).toBe(4);
    expect(s.staffMembers).toHaveLength(1);
    expect(s.totalCost).toBe(5000);
  });
});

describe("playerdetails", () => {
  it("parses chardata CupGoals, skills, transfer and last match", () => {
    const root = decodeXml(
      wrap(
        "playerdetails",
        `<Player><PlayerID>42</PlayerID><FirstName>Jan</FirstName><LastName>Toorn</LastName>
         <CupGoals Available="true">5</CupGoals>
         <PlayerSkills><KeeperSkill>6</KeeperSkill><PlaymakerSkill>8</PlaymakerSkill></PlayerSkills>
         <TransferDetails><AskingPrice>250000</AskingPrice><BidderTeam><TeamID>9</TeamID><TeamName>Z</TeamName></BidderTeam></TransferDetails>
         <LastMatch><MatchId>1001</MatchId><Rating>4.5</Rating><PositionCode>100</PositionCode></LastMatch></Player>`,
      ),
      "playerdetails",
    );
    const p = mapPlayerDetails(root);
    expect(p.id).toBe(42);
    expect(p.cupGoals).toBe(5);
    expect(p.playmakerSkill).toBe(8);
    expect(p.transfer.askingPriceSek).toBe(250000);
    expect(p.transfer.bidderTeamId).toBe(9);
    expect(p.lastMatch.id).toBe(1001);
    expect(p.lastMatch.rating).toBe(4.5);
  });
});

describe("matchdetails", () => {
  it("parses side-prefixed team ratings, scorers with Index attr and events", () => {
    const root = decodeXml(
      wrap(
        "matchdetails",
        `<Match><MatchID>500</MatchID><MatchType>1</MatchType>
         <HomeTeam><HomeTeamID>7</HomeTeamID><HomeTeamName>A</HomeTeamName><HomeGoals>2</HomeGoals><RatingMidfield>11</RatingMidfield></HomeTeam>
         <AwayTeam><AwayTeamID>8</AwayTeamID><AwayTeamName>B</AwayTeamName><AwayGoals>1</AwayGoals><RatingMidfield>9</RatingMidfield></AwayTeam>
         <Arena><ArenaID>1</ArenaID><SoldTotal>3000</SoldTotal></Arena>
         <Scorers><Goal Index="1"><ScorerPlayerID>42</ScorerPlayerID><ScorerMinute>23</ScorerMinute></Goal></Scorers>
         <EventList><Event><Minute>23</Minute><EventTypeID>279</EventTypeID></Event></EventList></Match>`,
      ),
      "matchdetails",
    );
    const m = mapMatchDetails(root);
    expect(m.homeTeam.teamId).toBe(7);
    expect(m.homeTeam.goals).toBe(2);
    expect(m.homeTeam.ratingMidfield).toBe(11);
    expect(m.awayTeam.ratingMidfield).toBe(9);
    expect(m.goals[0]!.index).toBe(1);
    expect(m.goals[0]!.scorerMinute).toBe(23);
    expect(m.events[0]!.eventTypeId).toBe(279);
  });
});

describe("matchlineup", () => {
  it("parses starting lineup, substitutions and final ratings", () => {
    const root = decodeXml(
      wrap(
        "matchlineup",
        `<MatchID>500</MatchID><SourceSystem>Hattrick</SourceSystem>
         <HomeTeam><HomeTeamID>7</HomeTeamID></HomeTeam><AwayTeam><AwayTeamID>8</AwayTeamID></AwayTeam>
         <Team><TeamID>7</TeamID><TeamName>A</TeamName>
         <StartingLineup><Player><PlayerID>1</PlayerID><RoleID>100</RoleID></Player></StartingLineup>
         <Substitutions><Substitution><SubjectPlayerID>1</SubjectPlayerID><OrderType>1</OrderType><MatchMinute>60</MatchMinute></Substitution></Substitutions>
         <Lineup><Player><PlayerID>1</PlayerID><RoleID>100</RoleID><RatingStars>3.5</RatingStars></Player></Lineup></Team>`,
      ),
      "matchlineup",
    );
    const l = mapMatchLineup(root);
    expect(l.teamId).toBe(7);
    expect(l.startingLineup[0]!.roleId).toBe(100);
    expect(l.substitutions[0]!.matchMinute).toBe(60);
    expect(l.lineup[0]!.ratingStars).toBe(3.5);
  });
});

describe("cupmatches", () => {
  it("reads the MatchResult Available attribute", () => {
    const root = decodeXml(
      wrap(
        "cupmatches",
        `<Cup><CupID>13</CupID><CupName>KNVB</CupName><CupSeason>90</CupSeason><CupRound>1</CupRound>
         <MatchList><Match><MatchID>1</MatchID>
           <HomeTeam><TeamId>7</TeamId><TeamName>A</TeamName></HomeTeam>
           <AwayTeam><TeamId>8</TeamId><TeamName>B</TeamName></AwayTeam>
           <MatchResult Available="true"><HomeGoals>3</HomeGoals><AwayGoals>0</AwayGoals></MatchResult></Match></MatchList></Cup>`,
      ),
      "cupmatches",
    );
    const c = mapCupMatches(root);
    expect(c.cupId).toBe(13);
    expect(c.matches[0]!.played).toBe(true);
    expect(c.matches[0]!.homeGoals).toBe(3);
  });
});

describe("currentbids", () => {
  it("degroups bids and carries the TrackingTypeId attribute", () => {
    const root = decodeXml(
      wrap(
        "currentbids",
        `<TeamId>7</TeamId>
         <BidItems TrackingTypeId="5"><BidItem><TransferId>1</TransferId><PlayerId>42</PlayerId><PlayerName>X</PlayerName>
           <HighestBid><Amount>100000</Amount><TeamId>9</TeamId></HighestBid></BidItem></BidItems>`,
      ),
      "currentbids",
    );
    const bids = mapCurrentBids(root);
    expect(bids).toHaveLength(1);
    expect(bids[0]!.trackingTypeId).toBe(5);
    expect(bids[0]!.highestBidSek).toBe(100000);
  });
});

describe("nationalteamdetails", () => {
  it("parses the formation experience map and chardata supporters popularity", () => {
    const root = decodeXml(
      wrap(
        "nationalteamdetails",
        `<Team><TeamID>3001</TeamID><TeamName>NL</TeamName>
         <Experience442>10</Experience442><Experience433>8</Experience433>
         <SupportersPopularity Available="true">4</SupportersPopularity><Rank>12</Rank></Team>`,
      ),
      "nationalteamdetails",
    );
    const n = mapNationalTeamDetails(root);
    expect(n.id).toBe(3001);
    expect(n.experience["442"]).toBe(10);
    expect(n.supportersPopularity).toBe(4);
    expect(n.rank).toBe(12);
  });
});

describe("leaguedetails/series", () => {
  it("parses a standings table", () => {
    const root = decodeXml(
      wrap(
        "leaguedetails",
        `<LeagueLevelUnitID>17577</LeagueLevelUnitID><LeagueLevelUnitName>VI.102</LeagueLevelUnitName>
         <LeagueLevel>6</LeagueLevel>
         <Team><TeamID>7</TeamID><TeamName>A</TeamName><Position>1</Position><Points>12</Points></Team>
         <Team><TeamID>8</TeamID><TeamName>B</TeamName><Position>2</Position><Points>9</Points></Team>`,
      ),
      "leaguedetails",
    );
    const s = mapSeries(root);
    expect(s.id).toBe(17577);
    expect(s.teams).toHaveLength(2);
    expect(s.teams[0]!.points).toBe(12);
  });
});

describe("youthplayerdetails", () => {
  it("parses youth skills with attributes and chardata", () => {
    const root = decodeXml(
      wrap(
        "youthplayerdetails",
        `<YouthPlayer><YouthPlayerID>77</YouthPlayerID><FirstName>Kees</FirstName>
         <PlayerSkills>
           <ScorerSkill IsAvailable="true" IsMaxReached="false" MayUnlock="true">5</ScorerSkill>
           <ScorerSkillMax IsAvailable="true" IsMaxReached="false" MayUnlock="false">7</ScorerSkillMax>
         </PlayerSkills></YouthPlayer>`,
      ),
      "youthplayerdetails",
    );
    const y = mapYouthPlayerDetails(root);
    expect(y.id).toBe(77);
    expect(y.skills.scorer!.value).toBe(5);
    expect(y.skills.scorer!.available).toBe(true);
    expect(y.skills.scorer!.mayUnlock).toBe(true);
    expect(y.skills.scorerMax!.value).toBe(7);
  });
});

describe("matchorders", () => {
  it("parses Available/OrdersSet attrs, positions, named players and coach modifier", () => {
    const root = decodeXml(
      wrap(
        "matchorders",
        `<MatchData Available="true" OrdersSet="false">
         <CoachModifier Available="true">0</CoachModifier>
         <HomeTeam><HomeTeamID>7</HomeTeamID></HomeTeam><AwayTeam><AwayTeamID>8</AwayTeamID></AwayTeam>
         <Lineup>
           <Positions><Player><PlayerID>1</PlayerID><RoleID>100</RoleID><Behaviour>0</Behaviour></Player></Positions>
           <Bench><Player><PlayerID>2</PlayerID><RoleID>200</RoleID></Player></Bench>
           <Captain><PlayerID>1</PlayerID><FirstName>C</FirstName></Captain>
         </Lineup>
         <PlayerOrders><PlayerOrder><PlayerOrderID>1</PlayerOrderID><SubjectPlayerID>2</SubjectPlayerID></PlayerOrder></PlayerOrders></MatchData>`,
      ),
      "matchorders",
    );
    const o = mapMatchOrders(root);
    expect(o.available).toBe(true);
    expect(o.ordersSet).toBe(false);
    expect(o.coachModifier).toBe(0);
    expect(o.positions[0]!.roleId).toBe(100);
    expect(o.bench[0]!.playerId).toBe(2);
    expect(o.captain!.playerId).toBe(1);
    expect(o.playerOrders[0]!.subjectPlayerId).toBe(2);
  });
});

describe("challenges", () => {
  it("parses challenges by me and offers by others", () => {
    const root = decodeXml(
      wrap(
        "challenges",
        `<Team><TeamID>7</TeamID>
         <ChallengesByMe><Challenge><TrainingMatchID>1</TrainingMatchID><Opponent><TeamID>8</TeamID><TeamName>B</TeamName><IsAgreed>true</IsAgreed></Opponent></Challenge></ChallengesByMe>
         <OffersByOthers><Offer><TrainingMatchID>2</TrainingMatchID><Opponent><TeamID>9</TeamID><TeamName>C</TeamName></Opponent></Offer></OffersByOthers></Team>`,
      ),
      "challenges",
    );
    const c = mapChallenges(root);
    expect(c.challengesByMe[0]!.opponentTeamId).toBe(8);
    expect(c.challengesByMe[0]!.isAgreed).toBe(true);
    expect(c.offersByOthers[0]!.trainingMatchId).toBe(2);
  });
});

describe("translations", () => {
  it("parses value/type attribute lists and chardata", () => {
    const root = decodeXml(
      wrap(
        "translations",
        `<Language Id="2">English</Language>
         <Texts>
           <SkillNames><Skill Type="playmaking">Playmaking</Skill></SkillNames>
           <SkillLevels><Level Value="8">excellent</Level></SkillLevels>
         </Texts>`,
      ),
      "translations",
    );
    const t = mapTranslations(root);
    expect(t.languageId).toBe(2);
    expect(t.languageName).toBe("English");
    expect(t.skillNames[0]!).toEqual({ type: "playmaking", text: "Playmaking" });
    expect(t.skillLevels[0]!).toEqual({ value: "8", text: "excellent" });
  });
});
