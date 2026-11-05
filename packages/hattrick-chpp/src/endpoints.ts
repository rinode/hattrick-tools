// Endpoint models and XML mappers, ported field-for-field from the Go
// lucianoq/hattrick `chpp/file_*.go` structs. The HattrickClient (client.ts)
// has one thin method per operation that calls these mappers.
//
// Conventions matching the existing core endpoints:
//   - HattrickTime / dates          -> string (as returned)
//   - Money (SEK)                    -> number, field suffixed `Sek`
//   - typed enums (ids, moods, ...)  -> number (the CHPP numeric value)
//   - repeated elements              -> asArray(...)
import { asArray, bool, num, str, type HattrickData } from "./xml.js";

function rec(v: unknown): Record<string, unknown> {
  return (v ?? {}) as Record<string, unknown>;
}
type R = Record<string, unknown>;

// ===========================================================================
// club (1.5)
// ===========================================================================
export const CLUB_FILE = "club";
export const CLUB_VERSION = "1.5";

export interface Club {
  teamId: number;
  teamName: string;
  staff: {
    assistantTrainerLevels: number;
    financialDirectorLevels: number;
    formCoachLevels: number;
    medicLevels: number;
    spokespersonLevels: number;
    sportPsychologistLevels: number;
    tacticalAssistantLevels: number;
  };
  youthSquad: { investmentSek: number; hasPromoted: boolean; youthLevel: number };
}

export function mapClub(root: HattrickData): Club {
  const t = rec(root["Team"]);
  const s = rec(t["Staff"]);
  const y = rec(t["YouthSquad"]);
  return {
    teamId: num(t["TeamID"]),
    teamName: str(t["TeamName"]),
    staff: {
      assistantTrainerLevels: num(s["AssistantTrainerLevels"]),
      financialDirectorLevels: num(s["FinancialDirectorLevels"]),
      formCoachLevels: num(s["FormCoachLevels"]),
      medicLevels: num(s["MedicLevels"]),
      spokespersonLevels: num(s["SpokespersonLevels"]),
      sportPsychologistLevels: num(s["SportPsychologistLevels"]),
      tacticalAssistantLevels: num(s["TacticalAssistantLevels"]),
    },
    youthSquad: {
      investmentSek: num(y["Investment"]),
      hasPromoted: bool(y["HasPromoted"]),
      youthLevel: num(y["YouthLevel"]),
    },
  };
}

// ===========================================================================
// arenadetails (1.7)
// ===========================================================================
export const ARENADETAILS_FILE = "arenadetails";
export const ARENADETAILS_VERSION = "1.7";

export interface ArenaSeats {
  terraces: number;
  basic: number;
  roof: number;
  vip: number;
  total: number;
}
export interface ArenaCapacity extends ArenaSeats {
  available: boolean;
  /** RebuiltDate for current capacity, ExpansionDate for expanded. */
  date: string;
}
export interface Arena {
  id: number;
  name: string;
  image: string;
  fallbackImage: string;
  teamId: number;
  teamName: string;
  leagueId: number;
  leagueName: string;
  regionId: number;
  regionName: string;
  currentCapacity: ArenaCapacity;
  expandedCapacity: ArenaCapacity;
}

function mapSeats(c: R): ArenaSeats {
  return {
    terraces: num(c["Terraces"]),
    basic: num(c["Basic"]),
    roof: num(c["Roof"]),
    vip: num(c["VIP"]),
    total: num(c["Total"]),
  };
}

export function mapArena(root: HattrickData): Arena {
  const a = rec(root["Arena"]);
  const cur = rec(a["CurrentCapacity"]);
  const exp = rec(a["ExpandedCapacity"]);
  return {
    id: num(a["ArenaID"]),
    name: str(a["ArenaName"]),
    image: str(a["ArenaImage"]),
    fallbackImage: str(a["ArenaFallbackImage"]),
    teamId: num(rec(a["Team"])["TeamID"]),
    teamName: str(rec(a["Team"])["TeamName"]),
    leagueId: num(rec(a["League"])["LeagueID"]),
    leagueName: str(rec(a["League"])["LeagueName"]),
    regionId: num(rec(a["Region"])["RegionID"]),
    regionName: str(rec(a["Region"])["RegionName"]),
    currentCapacity: {
      available: bool(cur["@_Available"]),
      date: str(cur["RebuiltDate"]),
      ...mapSeats(cur),
    },
    expandedCapacity: {
      available: bool(exp["@_Available"]),
      date: str(exp["ExpansionDate"]),
      ...mapSeats(exp),
    },
  };
}

export interface ArenaStat {
  id: number;
  name: string;
  image: string;
  fallbackImage: string;
  size: number;
  leagueId: number;
  leagueName: string;
  regionId: number;
  regionName: string;
}
export interface LeagueArenaStats {
  leagueId: number;
  leagueName: string;
  createdDate: string;
  stats: ArenaStat[];
}

export function mapLeagueArenaStats(root: HattrickData): LeagueArenaStats {
  const l = rec(root["LeagueArenaStats"]);
  return {
    leagueId: num(l["LeagueID"]),
    leagueName: str(l["LeagueName"]),
    createdDate: str(l["CreatedDate"]),
    stats: asArray<R>(rec(l["OtherArenasStatList"])["ArenaStat"]).map((s) => ({
      id: num(s["ArenaID"]),
      name: str(s["ArenaName"]),
      image: str(s["ArenaImage"]),
      fallbackImage: str(s["ArenaFallbackImage"]),
      size: num(s["ArenaSize"]),
      leagueId: num(s["ArenaLeagueID"]),
      leagueName: str(s["ArenaLeagueName"]),
      regionId: num(s["ArenaRegionID"]),
      regionName: str(s["ArenaRegionName"]),
    })),
  };
}

export interface MyArenaStats {
  id: number;
  name: string;
  image: string;
  fallbackImage: string;
  matchTypes: number;
  firstDate: string;
  lastDate: string;
  numberOfMatches: number;
  visitorsAverage: ArenaSeats;
  visitorsMost: ArenaSeats;
  visitorsLeast: ArenaSeats;
}

export function mapMyArenaStats(root: HattrickData): MyArenaStats {
  const m = rec(root["MyArena"]);
  return {
    id: num(m["ArenaID"]),
    name: str(m["ArenaName"]),
    image: str(m["ArenaImage"]),
    fallbackImage: str(m["ArenaFallbackImage"]),
    matchTypes: num(m["MatchTypes"]),
    firstDate: str(m["FirstDate"]),
    lastDate: str(m["LastDate"]),
    numberOfMatches: num(m["NumberOfMatches"]),
    visitorsAverage: mapSeats(rec(m["VisitorsAverage"])),
    visitorsMost: mapSeats(rec(m["VisitorsMost"])),
    visitorsLeast: mapSeats(rec(m["VisitorsLeast"])),
  };
}

// ===========================================================================
// fans (1.3)
// ===========================================================================
export const FANS_FILE = "fans";
export const FANS_VERSION = "1.3";

export interface FansPlayedMatch {
  matchId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: string;
  matchType: number;
  homeGoals: number;
  awayGoals: number;
  fanMatchExpectation: number;
  fanMoodAfterMatch: number;
  weather: number;
  soldSeats: number;
}
export interface FansUpcomingMatch {
  matchId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: string;
  matchType: number;
  fanMatchExpectation: number;
}
export interface Fans {
  teamId: number;
  fanClubId: number;
  fanClubName: string;
  fanMood: number;
  members: number;
  fanSeasonExpectation: number;
  playedMatches: FansPlayedMatch[];
  upcomingMatches: FansUpcomingMatch[];
}

export function mapFans(root: HattrickData): Fans {
  const t = rec(root["Team"]);
  return {
    teamId: num(t["TeamID"]),
    fanClubId: num(t["FanClubId"]),
    fanClubName: str(t["FanClubName"]),
    fanMood: num(t["FanMood"]),
    members: num(t["Members"]),
    fanSeasonExpectation: num(t["FanSeasonExpectation"]),
    playedMatches: asArray<R>(rec(t["PlayedMatches"])["Match"]).map((m) => ({
      matchId: num(m["MatchID"]),
      homeTeamId: num(rec(m["HomeTeam"])["HomeTeamID"]),
      homeTeamName: str(rec(m["HomeTeam"])["HomeTeamName"]),
      awayTeamId: num(rec(m["AwayTeam"])["AwayTeamID"]),
      awayTeamName: str(rec(m["AwayTeam"])["AwayTeamName"]),
      matchDate: str(m["MatchDate"]),
      matchType: num(m["MatchType"]),
      homeGoals: num(m["HomeGoals"]),
      awayGoals: num(m["AwayGoals"]),
      fanMatchExpectation: num(m["FanMatchExpectation"]),
      fanMoodAfterMatch: num(m["FanMoodAfterMatch"]),
      weather: num(m["Weather"]),
      soldSeats: num(m["SoldSeats"]),
    })),
    upcomingMatches: asArray<R>(rec(t["UpcomingMatches"])["Match"]).map((m) => ({
      matchId: num(m["MatchID"]),
      homeTeamId: num(rec(m["HomeTeam"])["HomeTeamID"]),
      homeTeamName: str(rec(m["HomeTeam"])["HomeTeamName"]),
      awayTeamId: num(rec(m["AwayTeam"])["AwayTeamID"]),
      awayTeamName: str(rec(m["AwayTeam"])["AwayTeamName"]),
      matchDate: str(m["MatchDate"]),
      matchType: num(m["MatchType"]),
      fanMatchExpectation: num(m["FanMatchExpectation"]),
    })),
  };
}

// ===========================================================================
// stafflist (1.2)
// ===========================================================================
export const STAFFLIST_FILE = "stafflist";
export const STAFFLIST_VERSION = "1.2";

export interface Trainer {
  id: number;
  name: string;
  age: number;
  ageDays: number;
  contractDate: string;
  cost: number;
  countryId: number;
  trainerType: number;
  leadership: number;
  trainerSkillLevel: number;
  trainerStatus: number;
}
export interface StaffMember {
  id: number;
  name: string;
  type: number;
  level: number;
  hiredDate: string;
  cost: number;
  hofPlayerId: number;
}
export interface StaffList {
  trainer: Trainer;
  staffMembers: StaffMember[];
  totalStaffMembers: number;
  totalCost: number;
}

export function mapStaffList(root: HattrickData): StaffList {
  const s = rec(root["StaffList"]);
  const tr = rec(s["Trainer"]);
  return {
    trainer: {
      id: num(tr["TrainerId"]),
      name: str(tr["Name"]),
      age: num(tr["Age"]),
      ageDays: num(tr["AgeDays"]),
      contractDate: str(tr["ContractDate"]),
      cost: num(tr["Cost"]),
      countryId: num(tr["CountryID"]),
      trainerType: num(tr["TrainerType"]),
      leadership: num(tr["Leadership"]),
      trainerSkillLevel: num(tr["TrainerSkillLevel"]),
      trainerStatus: num(tr["TrainerStatus"]),
    },
    staffMembers: asArray<R>(rec(s["StaffMembers"])["Staff"]).map((m) => ({
      id: num(m["StaffId"]),
      name: str(m["Name"]),
      type: num(m["StaffType"]),
      level: num(m["StaffLevel"]),
      hiredDate: str(m["HiredDate"]),
      cost: num(m["Cost"]),
      hofPlayerId: num(m["HofPlayerId"]),
    })),
    totalStaffMembers: num(s["TotalStaffMembers"]),
    totalCost: num(s["TotalCost"]),
  };
}

function chardata(v: unknown): unknown {
  return v && typeof v === "object" ? (v as R)["#text"] : v;
}

// ===========================================================================
// playerdetails (3.2)
// ===========================================================================
export const PLAYERDETAILS_FILE = "playerdetails";
export const PLAYERDETAILS_VERSION = "3.2";

export interface PlayerTransferDetails {
  askingPriceSek: number;
  deadline: string;
  highestBidSek: number;
  maxBidSek: number;
  bidderTeamId: number;
  bidderTeamName: string;
}
export interface PlayerLastMatch {
  date: string;
  id: number;
  positionCode: number;
  playedMinutes: number;
  rating: number;
  ratingEndOfGame: number;
}
export interface PlayerDetails {
  id: number;
  firstName: string;
  nickName: string;
  lastName: string;
  number: number;
  categoryId: number;
  ownerNotes: string;
  age: number;
  ageDays: number;
  nextBirthday: string;
  gender: number;
  arrivalDate: string;
  form: number;
  cards: number;
  injuryLevel: number;
  statement: string;
  language: string;
  languageId: number;
  trainerType: number;
  trainerSkillLevel: number;
  agreeability: number;
  aggressiveness: number;
  honesty: number;
  experience: number;
  loyalty: number;
  motherClubBonus: boolean;
  motherClubTeamId: number;
  motherClubTeamName: string;
  leadership: number;
  specialtyId: number;
  nativeCountryId: number;
  nativeLeagueId: number;
  nativeLeagueName: string;
  tsi: number;
  owningTeamId: number;
  owningTeamName: string;
  owningLeagueId: number;
  salarySek: number;
  isAbroad: boolean;
  staminaSkill: number;
  keeperSkill: number;
  playmakerSkill: number;
  scorerSkill: number;
  passingSkill: number;
  wingerSkill: number;
  defenderSkill: number;
  setPiecesSkill: number;
  caps: number;
  capsU20: number;
  careerGoals: number;
  careerHattricks: number;
  leagueGoals: number;
  cupGoals: number;
  friendliesGoals: number;
  matchesCurrentTeam: number;
  goalsCurrentTeam: number;
  assistsCurrentTeam: number;
  careerAssists: number;
  nationalTeamId: number;
  nationalTeamName: string;
  transferListed: boolean;
  transfer: PlayerTransferDetails;
  lastMatch: PlayerLastMatch;
}

export function mapPlayerDetails(root: HattrickData): PlayerDetails {
  const p = rec(root["Player"]);
  const td = rec(p["TrainerData"]);
  const mc = rec(p["MotherClub"]);
  const ot = rec(p["OwningTeam"]);
  const sk = rec(p["PlayerSkills"]);
  const tr = rec(p["TransferDetails"]);
  const bt = rec(tr["BidderTeam"]);
  const lm = rec(p["LastMatch"]);
  return {
    id: num(p["PlayerID"]),
    firstName: str(p["FirstName"]),
    nickName: str(p["NickName"]),
    lastName: str(p["LastName"]),
    number: num(p["PlayerNumber"]),
    categoryId: num(p["PlayerCategoryID"]),
    ownerNotes: str(p["OwnerNotes"]),
    age: num(p["Age"]),
    ageDays: num(p["AgeDays"]),
    nextBirthday: str(p["NextBirthDay"]),
    gender: num(p["GenderID"]),
    arrivalDate: str(p["ArrivalDate"]),
    form: num(p["PlayerForm"]),
    cards: num(p["Cards"]),
    injuryLevel: num(p["InjuryLevel"]),
    statement: str(p["Statement"]),
    language: str(p["PlayerLanguage"]),
    languageId: num(p["PlayerLanguageID"]),
    trainerType: num(td["TrainerType"]),
    trainerSkillLevel: num(td["TrainerSkillLevel"]),
    agreeability: num(p["Agreeability"]),
    aggressiveness: num(p["Aggressiveness"]),
    honesty: num(p["Honesty"]),
    experience: num(p["Experience"]),
    loyalty: num(p["Loyalty"]),
    motherClubBonus: bool(p["MotherClubBonus"]),
    motherClubTeamId: num(mc["TeamID"]),
    motherClubTeamName: str(mc["TeamName"]),
    leadership: num(p["Leadership"]),
    specialtyId: num(p["Specialty"]),
    nativeCountryId: num(p["NativeCountryID"]),
    nativeLeagueId: num(p["NativeLeagueID"]),
    nativeLeagueName: str(p["NativeLeagueName"]),
    tsi: num(p["TSI"]),
    owningTeamId: num(ot["TeamID"]),
    owningTeamName: str(ot["TeamName"]),
    owningLeagueId: num(ot["LeagueID"]),
    salarySek: num(p["Salary"]),
    isAbroad: bool(p["IsAbroad"]),
    staminaSkill: num(sk["StaminaSkill"]),
    keeperSkill: num(sk["KeeperSkill"]),
    playmakerSkill: num(sk["PlaymakerSkill"]),
    scorerSkill: num(sk["ScorerSkill"]),
    passingSkill: num(sk["PassingSkill"]),
    wingerSkill: num(sk["WingerSkill"]),
    defenderSkill: num(sk["DefenderSkill"]),
    setPiecesSkill: num(sk["SetPiecesSkill"]),
    caps: num(p["Caps"]),
    capsU20: num(p["CapsU20"]),
    careerGoals: num(p["CareerGoals"]),
    careerHattricks: num(p["CareerHattricks"]),
    leagueGoals: num(p["LeagueGoals"]),
    cupGoals: num(chardata(p["CupGoals"])),
    friendliesGoals: num(p["FriendliesGoals"]),
    matchesCurrentTeam: num(p["MatchesCurrentTeam"]),
    goalsCurrentTeam: num(p["GoalsCurrentTeam"]),
    assistsCurrentTeam: num(p["AssistsCurrentTeam"]),
    careerAssists: num(p["CareerAssists"]),
    nationalTeamId: num(p["NationalTeamID"]),
    nationalTeamName: str(p["NationalTeamName"]),
    transferListed: bool(p["TransferListed"]),
    transfer: {
      askingPriceSek: num(tr["AskingPrice"]),
      deadline: str(tr["Deadline"]),
      highestBidSek: num(tr["HighestBid"]),
      maxBidSek: num(tr["MaxBid"]),
      bidderTeamId: num(bt["TeamID"]),
      bidderTeamName: str(bt["TeamName"]),
    },
    lastMatch: {
      date: str(lm["Date"]),
      id: num(lm["MatchId"]),
      positionCode: num(lm["PositionCode"]),
      playedMinutes: num(lm["PlayedMinutes"]),
      rating: num(lm["Rating"]),
      ratingEndOfGame: num(lm["RatingEndOfGame"]),
    },
  };
}

// ===========================================================================
// playerevents (1.3)
// ===========================================================================
export const PLAYEREVENTS_FILE = "playerevents";
export const PLAYEREVENTS_VERSION = "1.3";

export interface PlayerEvent {
  eventDate: string;
  playerEventTypeId: number;
  eventText: string;
}

export function mapPlayerEvents(root: HattrickData): PlayerEvent[] {
  const ev = rec(rec(root["Player"])["PlayerEvents"]);
  return asArray<R>(ev["PlayerEvent"]).map((e) => ({
    eventDate: str(e["EventDate"]),
    playerEventTypeId: num(e["PlayerEventTypeID"]),
    eventText: str(e["EventText"]),
  }));
}

// ===========================================================================
// transfersplayer (1.1)
// ===========================================================================
export const TRANSFERSPLAYER_FILE = "transfersplayer";
export const TRANSFERSPLAYER_VERSION = "1.1";

export interface PlayerTransfer {
  id: number;
  deadline: string;
  buyerTeamId: number;
  buyerTeamName: string;
  sellerTeamId: number;
  sellerTeamName: string;
  priceSek: number;
  tsi: number;
}
export interface PlayerTransferHistory {
  startDate: string;
  endDate: string;
  playerId: number;
  playerName: string;
  transfers: PlayerTransfer[];
}

export function mapPlayerTransferHistory(root: HattrickData): PlayerTransferHistory {
  const t = rec(root["Transfers"]);
  const p = rec(t["Player"]);
  return {
    startDate: str(t["StartDate"]),
    endDate: str(t["EndDate"]),
    playerId: num(p["PlayerID"]),
    playerName: str(p["PlayerName"]),
    transfers: asArray<R>(t["Transfer"]).map((x) => ({
      id: num(x["TransferID"]),
      deadline: str(x["Deadline"]),
      buyerTeamId: num(rec(x["Buyer"])["BuyerTeamID"]),
      buyerTeamName: str(rec(x["Buyer"])["BuyerTeamName"]),
      sellerTeamId: num(rec(x["Seller"])["SellerTeamID"]),
      sellerTeamName: str(rec(x["Seller"])["SellerTeamName"]),
      priceSek: num(x["Price"]),
      tsi: num(x["TSI"]),
    })),
  };
}

// ===========================================================================
// transfersteam (1.2)
// ===========================================================================
export const TRANSFERSTEAM_FILE = "transfersteam";
export const TRANSFERSTEAM_VERSION = "1.2";

export interface TeamTransfer {
  id: number;
  deadline: string;
  playerId: number;
  playerName: string;
  tsi: number;
  transferType: string; // "S" sale or "B" buy, from the team's point of view
  buyerTeamId: number;
  buyerTeamName: string;
  sellerTeamId: number;
  sellerTeamName: string;
  priceSek: number;
}
export interface TeamTransfers {
  teamId: number;
  teamName: string;
  activatedDate: string;
  totalSumOfBuysSek: number;
  totalSumOfSalesSek: number;
  numberOfBuys: number;
  numberOfSales: number;
  pageIndex: number;
  pages: number;
  startDate: string;
  endDate: string;
  transfers: TeamTransfer[];
}

export function mapTeamTransfers(root: HattrickData): TeamTransfers {
  const team = rec(root["Team"]);
  const stats = rec(root["Stats"]);
  const t = rec(root["Transfers"]);
  return {
    teamId: num(team["TeamID"]),
    teamName: str(team["TeamName"]),
    activatedDate: str(team["ActivatedDate"]),
    totalSumOfBuysSek: num(stats["TotalSumOfBuys"]),
    totalSumOfSalesSek: num(stats["TotalSumOfSales"]),
    numberOfBuys: num(stats["NumberOfBuys"]),
    numberOfSales: num(stats["NumberOfSales"]),
    pageIndex: num(t["PageIndex"]),
    pages: num(t["Pages"]),
    startDate: str(t["StartDate"]),
    endDate: str(t["EndDate"]),
    transfers: asArray<R>(t["Transfer"]).map((x) => {
      const pl = rec(x["Player"]);
      return {
        id: num(x["TransferID"]),
        deadline: str(x["Deadline"]),
        playerId: num(pl["PlayerID"]),
        playerName: str(pl["PlayerName"]),
        tsi: num(pl["TSI"]),
        transferType: str(pl["TransferType"]),
        buyerTeamId: num(rec(x["Buyer"])["BuyerTeamID"]),
        buyerTeamName: str(rec(x["Buyer"])["BuyerTeamName"]),
        sellerTeamId: num(rec(x["Seller"])["SellerTeamID"]),
        sellerTeamName: str(rec(x["Seller"])["SellerTeamName"]),
        priceSek: num(x["Price"]),
      };
    }),
  };
}

// ===========================================================================
// hofplayers (1.2)
// ===========================================================================
export const HOFPLAYERS_FILE = "hofplayers";
export const HOFPLAYERS_VERSION = "1.2";

export interface HofPlayer {
  playerId: number;
  firstName: string;
  nickName: string;
  lastName: string;
  age: number;
  nextBirthday: string;
  countryId: number;
  arrivalDate: string;
  expertType: number;
  hofDate: string;
  hofAge: number;
}

export function mapHofPlayers(root: HattrickData): HofPlayer[] {
  return asArray<R>(rec(root["PlayerList"])["Player"]).map((p) => ({
    playerId: num(p["PlayerID"]),
    firstName: str(p["FirstName"]),
    nickName: str(p["NickName"]),
    lastName: str(p["LastName"]),
    age: num(p["Age"]),
    nextBirthday: str(p["NextBirthday"]),
    countryId: num(p["CountryID"]),
    arrivalDate: str(p["ArrivalDate"]),
    expertType: num(p["ExpertType"]),
    hofDate: str(p["HofDate"]),
    hofAge: num(p["HofAge"]),
  }));
}

// ===========================================================================
// currentbids (1.0)
// ===========================================================================
export const CURRENTBIDS_FILE = "currentbids";
export const CURRENTBIDS_VERSION = "1.0";

export interface Bid {
  transferId: number;
  trackingTypeId: number;
  playerId: number;
  playerName: string;
  highestBidSek: number;
  highestBidTeamId: number;
  highestBidTeamName: string;
  deadline: string;
}

export function mapCurrentBids(root: HattrickData): Bid[] {
  const groups = asArray<R>(rec(root["BidItems"])["BidItem"]);
  // CHPP groups bids under <BidItems TrackingTypeId=..> wrappers, each with
  // repeated <BidItem>. The parser lifts repeated <BidItems> into an array.
  const wrappers = asArray<R>(root["BidItems"]);
  const out: Bid[] = [];
  const push = (b: R, tracking: number): void => {
    const hb = rec(b["HighestBid"]);
    out.push({
      transferId: num(b["TransferId"]),
      trackingTypeId: tracking,
      playerId: num(b["PlayerId"]),
      playerName: str(b["PlayerName"]),
      highestBidSek: num(hb["Amount"]),
      highestBidTeamId: num(hb["TeamId"]),
      highestBidTeamName: str(hb["TeamName"]),
      deadline: str(b["Deadline"]),
    });
  };
  if (wrappers.length) {
    for (const w of wrappers) {
      const tracking = num(w["@_TrackingTypeId"]);
      for (const b of asArray<R>(w["BidItem"])) push(b, tracking);
    }
  } else {
    for (const b of groups) push(b, 0);
  }
  return out;
}

function attr(v: unknown, name: string): unknown {
  return rec(v)[`@_${name}`];
}

// ===========================================================================
// matchdetails (3.1)
// ===========================================================================
export const MATCHDETAILS_FILE = "matchdetails";
export const MATCHDETAILS_VERSION = "3.1";

export interface MatchDetailsTeam {
  teamId: number;
  teamName: string;
  dressUri: string;
  formation: string;
  goals: number;
  tacticType: number;
  tacticSkill: number;
  ratingMidfield: number;
  ratingRightDef: number;
  ratingMidDef: number;
  ratingLeftDef: number;
  ratingRightAtt: number;
  ratingMidAtt: number;
  ratingLeftAtt: number;
  ratingIndirectSetPiecesDef: number;
  ratingIndirectSetPiecesAtt: number;
  teamAttitude: number;
  nrOfChancesLeft: number;
  nrOfChancesCenter: number;
  nrOfChancesRight: number;
  nrOfChancesSpecialEvents: number;
  nrOfChancesOther: number;
}
export interface MatchGoal {
  index: number;
  scorerPlayerId: number;
  scorerPlayerName: string;
  scorerTeamId: number;
  scorerHomeGoals: number;
  scorerAwayGoals: number;
  scorerMinute: number;
  matchPart: number;
}
export interface MatchBooking {
  index: number;
  playerId: number;
  playerName: string;
  teamId: number;
  bookingType: number;
  minute: number;
  matchPart: number;
}
export interface MatchInjury {
  index: number;
  playerId: number;
  playerName: string;
  teamId: number;
  injuryType: number;
  minute: number;
  matchPart: number;
}
export interface MatchEvent {
  minute: number;
  matchPart: number;
  eventTypeId: number;
  eventVariation: number;
  eventText: string;
  subjectTeamId: number;
  subjectPlayerId: number;
  objectPlayerId: number;
}
export interface MatchDetails {
  matchId: number;
  matchType: number;
  matchContextId: number;
  matchRuleId: number;
  cupLevel: number;
  cupLevelIndex: number;
  matchDate: string;
  finishedDate: string;
  addedMinutes: number;
  homeTeam: MatchDetailsTeam;
  awayTeam: MatchDetailsTeam;
  arena: {
    id: number;
    name: string;
    weather: number;
    soldTotal: number;
    soldTerraces: number;
    soldBasic: number;
    soldRoof: number;
    soldVip: number;
  };
  referee: {
    id: number;
    name: string;
    countryId: number;
    countryName: string;
    teamId: number;
    teamName: string;
  };
  possessionFirstHalfHome: number;
  possessionFirstHalfAway: number;
  possessionSecondHalfHome: number;
  possessionSecondHalfAway: number;
  goals: MatchGoal[];
  bookings: MatchBooking[];
  injuries: MatchInjury[];
  events: MatchEvent[];
}

function mapMatchDetailsTeam(t: R, side: "Home" | "Away"): MatchDetailsTeam {
  return {
    teamId: num(t[`${side}TeamID`]),
    teamName: str(t[`${side}TeamName`]),
    dressUri: str(t["DressURI"]),
    formation: str(t["Formation"]),
    goals: num(t[`${side}Goals`]),
    tacticType: num(t["TacticType"]),
    tacticSkill: num(t["TacticSkill"]),
    ratingMidfield: num(t["RatingMidfield"]),
    ratingRightDef: num(t["RatingRightDef"]),
    ratingMidDef: num(t["RatingMidDef"]),
    ratingLeftDef: num(t["RatingLeftDef"]),
    ratingRightAtt: num(t["RatingRightAtt"]),
    ratingMidAtt: num(t["RatingMidAtt"]),
    ratingLeftAtt: num(t["RatingLeftAtt"]),
    ratingIndirectSetPiecesDef: num(t["RatingIndirectSetPiecesDef"]),
    ratingIndirectSetPiecesAtt: num(t["RatingIndirectSetPiecesAtt"]),
    teamAttitude: num(t["TeamAttitude"]),
    nrOfChancesLeft: num(t["NrOfChancesLeft"]),
    nrOfChancesCenter: num(t["NrOfChancesCenter"]),
    nrOfChancesRight: num(t["NrOfChancesRight"]),
    nrOfChancesSpecialEvents: num(t["NrOfChancesSpecialEvents"]),
    nrOfChancesOther: num(t["NrOfChancesOther"]),
  };
}

export function mapMatchDetails(root: HattrickData): MatchDetails {
  const m = rec(root["Match"]);
  const arena = rec(m["Arena"]);
  const ref = rec(rec(m["MatchOfficials"])["Referee"]);
  return {
    matchId: num(m["MatchID"]),
    matchType: num(m["MatchType"]),
    matchContextId: num(m["MatchContextId"]),
    matchRuleId: num(m["MatchRuleId"]),
    cupLevel: num(m["CupLevel"]),
    cupLevelIndex: num(m["CupLevelIndex"]),
    matchDate: str(m["MatchDate"]),
    finishedDate: str(m["FinishedDate"]),
    addedMinutes: num(m["AddedMinutes"]),
    homeTeam: mapMatchDetailsTeam(rec(m["HomeTeam"]), "Home"),
    awayTeam: mapMatchDetailsTeam(rec(m["AwayTeam"]), "Away"),
    arena: {
      id: num(arena["ArenaID"]),
      name: str(arena["ArenaName"]),
      weather: num(arena["WeatherID"]),
      soldTotal: num(arena["SoldTotal"]),
      soldTerraces: num(arena["SoldTerraces"]),
      soldBasic: num(arena["SoldBasic"]),
      soldRoof: num(arena["SoldRoof"]),
      soldVip: num(arena["SoldVIP"]),
    },
    referee: {
      id: num(ref["RefereeId"]),
      name: str(ref["RefereeName"]),
      countryId: num(ref["RefereeCountryId"]),
      countryName: str(ref["RefereeCountryName"]),
      teamId: num(ref["RefereeTeamId"]),
      teamName: str(ref["RefereeTeamname"]),
    },
    possessionFirstHalfHome: num(m["PossessionFirstHalfHome"]),
    possessionFirstHalfAway: num(m["PossessionFirstHalfAway"]),
    possessionSecondHalfHome: num(m["PossessionSecondHalfHome"]),
    possessionSecondHalfAway: num(m["PossessionSecondHalfAway"]),
    goals: asArray<R>(rec(m["Scorers"])["Goal"]).map((g) => ({
      index: num(attr(g, "Index")),
      scorerPlayerId: num(g["ScorerPlayerID"]),
      scorerPlayerName: str(g["ScorerPlayerName"]),
      scorerTeamId: num(g["ScorerTeamID"]),
      scorerHomeGoals: num(g["ScorerHomeGoals"]),
      scorerAwayGoals: num(g["ScorerAwayGoals"]),
      scorerMinute: num(g["ScorerMinute"]),
      matchPart: num(g["MatchPart"]),
    })),
    bookings: asArray<R>(rec(m["Bookings"])["Booking"]).map((b) => ({
      index: num(attr(b, "Index")),
      playerId: num(b["BookingPlayerID"]),
      playerName: str(b["BookingPlayerName"]),
      teamId: num(b["BookingTeamID"]),
      bookingType: num(b["BookingType"]),
      minute: num(b["BookingMinute"]),
      matchPart: num(b["MatchPart"]),
    })),
    injuries: asArray<R>(rec(m["Injuries"])["Injury"]).map((i) => ({
      index: num(attr(i, "Index")),
      playerId: num(i["InjuryPlayerID"]),
      playerName: str(i["InjuryPlayerName"]),
      teamId: num(i["InjuryTeamID"]),
      injuryType: num(i["InjuryType"]),
      minute: num(i["InjuryMinute"]),
      matchPart: num(i["MatchPart"]),
    })),
    events: asArray<R>(rec(m["EventList"])["Event"]).map((e) => ({
      minute: num(e["Minute"]),
      matchPart: num(e["MatchPart"]),
      eventTypeId: num(e["EventTypeID"]),
      eventVariation: num(e["EventVariation"]),
      eventText: str(e["EventText"]),
      subjectTeamId: num(e["SubjectTeamID"]),
      subjectPlayerId: num(e["SubjectPlayerID"]),
      objectPlayerId: num(e["ObjectPlayerID"]),
    })),
  };
}

// ===========================================================================
// matchlineup (2.1)
// ===========================================================================
export const MATCHLINEUP_FILE = "matchlineup";
export const MATCHLINEUP_VERSION = "2.1";

export interface LineupPlayer {
  playerId: number;
  roleId: number;
  firstName: string;
  lastName: string;
  nickName: string;
  ratingStars: number;
  ratingStarsEndOfMatch: number;
  behaviour: number;
}
export interface LineupSubstitution {
  teamId: number;
  subjectPlayerId: number;
  objectPlayerId: number;
  orderType: number;
  newPositionId: number;
  newPositionBehaviour: number;
  matchMinute: number;
  matchPart: number;
}
export interface MatchLineup {
  matchId: number;
  sourceSystem: string;
  matchType: number;
  matchContextId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  arenaId: number;
  arenaName: string;
  teamId: number;
  teamName: string;
  experienceLevel: number;
  styleOfPlay: number;
  startingLineup: LineupPlayer[];
  substitutions: LineupSubstitution[];
  lineup: LineupPlayer[];
}

function mapLineupPlayer(p: R): LineupPlayer {
  return {
    playerId: num(p["PlayerID"]),
    roleId: num(p["RoleID"]),
    firstName: str(p["FirstName"]),
    lastName: str(p["LastName"]),
    nickName: str(p["NickName"]),
    ratingStars: num(p["RatingStars"]),
    ratingStarsEndOfMatch: num(p["RatingStarsEndOfMatch"]),
    behaviour: num(p["Behaviour"]),
  };
}

export function mapMatchLineup(root: HattrickData): MatchLineup {
  const home = rec(root["HomeTeam"]);
  const away = rec(root["AwayTeam"]);
  const arena = rec(root["Arena"]);
  const team = rec(root["Team"]);
  return {
    matchId: num(root["MatchID"]),
    sourceSystem: str(root["SourceSystem"]),
    matchType: num(root["MatchType"]),
    matchContextId: num(root["MatchContextId"]),
    homeTeamId: num(home["HomeTeamID"]),
    homeTeamName: str(home["HomeTeamName"]),
    awayTeamId: num(away["AwayTeamID"]),
    awayTeamName: str(away["AwayTeamName"]),
    arenaId: num(arena["ArenaID"]),
    arenaName: str(arena["ArenaName"]),
    teamId: num(team["TeamID"]),
    teamName: str(team["TeamName"]),
    experienceLevel: num(team["ExperienceLevel"]),
    styleOfPlay: num(team["StyleOfPlay"]),
    startingLineup: asArray<R>(rec(team["StartingLineup"])["Player"]).map(mapLineupPlayer),
    substitutions: asArray<R>(rec(team["Substitutions"])["Substitution"]).map((s) => ({
      teamId: num(s["TeamID"]),
      subjectPlayerId: num(s["SubjectPlayerID"]),
      objectPlayerId: num(s["ObjectPlayerID"]),
      orderType: num(s["OrderType"]),
      newPositionId: num(s["NewPositionId"]),
      newPositionBehaviour: num(s["NewPositionBehaviour"]),
      matchMinute: num(s["MatchMinute"]),
      matchPart: num(s["MatchPart"]),
    })),
    lineup: asArray<R>(rec(team["Lineup"])["Player"]).map(mapLineupPlayer),
  };
}

// ===========================================================================
// cupmatches (1.4)
// ===========================================================================
export const CUPMATCHES_FILE = "cupmatches";
export const CUPMATCHES_VERSION = "1.4";

export interface CupMatch {
  matchId: number;
  matchDate: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  played: boolean;
  homeLeagueId: number;
  awayLeagueId: number;
  homeLeagueName: string;
  awayLeagueName: string;
}
export interface CupMatches {
  cupId: number;
  season: number;
  round: number;
  name: string;
  matches: CupMatch[];
}

export function mapCupMatches(root: HattrickData): CupMatches {
  const c = rec(root["Cup"]);
  return {
    cupId: num(c["CupID"]),
    season: num(c["CupSeason"]),
    round: num(c["CupRound"]),
    name: str(c["CupName"]),
    matches: asArray<R>(rec(c["MatchList"])["Match"]).map((m) => {
      const res = rec(m["MatchResult"]);
      const li = rec(m["LeagueInfo"]);
      return {
        matchId: num(m["MatchID"]),
        matchDate: str(m["MatchDate"]),
        homeTeamId: num(rec(m["HomeTeam"])["TeamId"]),
        homeTeamName: str(rec(m["HomeTeam"])["TeamName"]),
        awayTeamId: num(rec(m["AwayTeam"])["TeamId"]),
        awayTeamName: str(rec(m["AwayTeam"])["TeamName"]),
        homeGoals: num(res["HomeGoals"]),
        awayGoals: num(res["AwayGoals"]),
        played: bool(res["@_Available"]),
        homeLeagueId: num(li["HomeLeagueID"]),
        awayLeagueId: num(li["AwayLeagueID"]),
        homeLeagueName: str(li["HomeLeagueName"]),
        awayLeagueName: str(li["AwayLeagueName"]),
      };
    }),
  };
}

// ===========================================================================
// matchesarchive (1.5) — reuses the matches `Match` shape
// ===========================================================================
export const MATCHESARCHIVE_FILE = "matchesarchive";
export const MATCHESARCHIVE_VERSION = "1.5";

import type { Avatar } from "./models.js";

function mapAvatarLocal(a: R): Avatar {
  return {
    backgroundImage: str(a["BackgroundImage"]),
    layers: asArray<R>(a["Layer"]).map((l) => ({
      image: str(l["Image"]),
      x: num(l["@_x"]),
      y: num(l["@_y"]),
    })),
  };
}

// ===========================================================================
// leaguelevels (1.0)
// ===========================================================================
export const LEAGUELEVELS_FILE = "leaguelevels";
export const LEAGUELEVELS_VERSION = "1.0";

export interface LeagueLevel {
  leagueLevel: number;
  nrOfLeagueLevelUnits: string;
  nrOfTeams: number;
  leagueLevelUnitIdList: string;
  nrOfSharedPromotionSlotsPerSeries: number;
  nrOfDirectPromotionSlotsPerSeries: number;
  nrOfQualificationPromotionSlotsPerSeries: number;
  nrOfDirectDemotionSlotsPerSeries: number;
  nrOfQualificationDemotionSlotsPerSeries: number;
}

export function mapLeagueLevels(root: HattrickData): LeagueLevel[] {
  return asArray<R>(rec(root["LeagueLevelList"])["LeagueLevelItem"]).map((l) => ({
    leagueLevel: num(l["LeagueLevel"]),
    nrOfLeagueLevelUnits: str(l["NrOfLeagueLevelUnits"]),
    nrOfTeams: num(l["NrOfTeams"]),
    leagueLevelUnitIdList: str(l["LeagueLevelUnitIdList"]),
    nrOfSharedPromotionSlotsPerSeries: num(l["NrOfSharedPromotionSlotsPerSeries"]),
    nrOfDirectPromotionSlotsPerSeries: num(l["NrOfDirectPromotionSlotsPerSeries"]),
    nrOfQualificationPromotionSlotsPerSeries: num(l["NrOfQualificationPromotionSlotsPerSeries"]),
    nrOfDirectDemotionSlotsPerSeries: num(l["NrOfDirectDemotionSlotsPerSeries"]),
    nrOfQualificationDemotionSlotsPerSeries: num(l["NrOfQualificationDemotionSlotsPerSeries"]),
  }));
}

// ===========================================================================
// regiondetails (1.2)
// ===========================================================================
export const REGIONDETAILS_FILE = "regiondetails";
export const REGIONDETAILS_VERSION = "1.2";

export interface RegionDetails {
  leagueId: number;
  leagueName: string;
  regionId: number;
  regionName: string;
  numberOfUsers: number;
  numberOfOnline: number;
  weather: number;
  tomorrowWeather: number;
}

export function mapRegionDetails(root: HattrickData): RegionDetails {
  const lg = rec(root["League"]);
  const r = rec(lg["Region"]);
  return {
    leagueId: num(lg["LeagueID"]),
    leagueName: str(lg["LeagueName"]),
    regionId: num(r["RegionID"]),
    regionName: str(r["RegionName"]),
    numberOfUsers: num(r["NumberOfUsers"]),
    numberOfOnline: num(r["NumberOfOnline"]),
    weather: num(r["WeatherID"]),
    tomorrowWeather: num(r["TomorrowWeatherID"]),
  };
}

// ===========================================================================
// supporters (1.0)
// ===========================================================================
export const SUPPORTERS_FILE = "supporters";
export const SUPPORTERS_VERSION = "1.0";

export interface SupporterTeam {
  userId: number;
  loginName: string;
  teamId: number;
  teamName: string;
  leagueId: number;
  leagueName: string;
  seriesId: number;
  seriesName: string;
  lastMatch?: {
    id: number;
    date: string;
    homeTeamId: number;
    homeTeamName: string;
    homeGoals: number;
    awayTeamId: number;
    awayTeamName: string;
    awayGoals: number;
  };
  nextMatch?: {
    id: number;
    date: string;
    homeTeamId: number;
    homeTeamName: string;
    awayTeamId: number;
    awayTeamName: string;
  };
}

function mapSupporterTeam(t: R): SupporterTeam {
  const lm = t["LastMatch"] ? rec(t["LastMatch"]) : undefined;
  const nm = t["NextMatch"] ? rec(t["NextMatch"]) : undefined;
  const out: SupporterTeam = {
    userId: num(t["UserId"]),
    loginName: str(t["LoginName"]),
    teamId: num(t["TeamId"]),
    teamName: str(t["TeamName"]),
    leagueId: num(t["LeagueID"]),
    leagueName: str(t["LeagueName"]),
    seriesId: num(t["LeagueLevelUnitID"]),
    seriesName: str(t["LeagueLevelUnitName"]),
  };
  if (lm) {
    out.lastMatch = {
      id: num(lm["LastMatchId"]),
      date: str(lm["LastMatchDate"]),
      homeTeamId: num(lm["LastMatchHomeTeamId"]),
      homeTeamName: str(lm["LastMatchHomeTeamName"]),
      homeGoals: num(lm["LastMatchHomeGoals"]),
      awayTeamId: num(lm["LastMatchAwayTeamId"]),
      awayTeamName: str(lm["LastMatchAwayTeamName"]),
      awayGoals: num(lm["LastMatchAwayGoals"]),
    };
  }
  if (nm) {
    out.nextMatch = {
      id: num(nm["NextMatchId"]),
      date: str(nm["NextMatchDate"]),
      homeTeamId: num(nm["NextMatchHomeTeamId"]),
      homeTeamName: str(nm["NextMatchHomeTeamName"]),
      awayTeamId: num(nm["NextMatchAwayTeamId"]),
      awayTeamName: str(nm["NextMatchAwayTeamName"]),
    };
  }
  return out;
}

export function mapSupportedTeams(root: HattrickData): SupporterTeam[] {
  return asArray<R>(rec(root["SupportedTeams"])["SupportedTeam"]).map(mapSupporterTeam);
}
export function mapMySupporters(root: HattrickData): SupporterTeam[] {
  return asArray<R>(rec(root["MySupporters"])["SupporterTeam"]).map(mapSupporterTeam);
}

// ===========================================================================
// staffavatars (1.1)
// ===========================================================================
export const STAFFAVATARS_FILE = "staffavatars";
export const STAFFAVATARS_VERSION = "1.1";

export interface StaffAvatars {
  trainerId: number;
  trainerAvatar: Avatar;
  staff: { id: number; avatar: Avatar }[];
}

export function mapStaffAvatars(root: HattrickData): StaffAvatars {
  const tr = rec(root["Trainer"]);
  return {
    trainerId: num(tr["TrainerId"]),
    trainerAvatar: mapAvatarLocal(rec(tr["Avatar"])),
    staff: asArray<R>(rec(root["StaffMembers"])["Staff"]).map((s) => ({
      id: num(s["StaffId"]),
      avatar: mapAvatarLocal(rec(s["Avatar"])),
    })),
  };
}

// ===========================================================================
// youthavatars (1.2)
// ===========================================================================
export const YOUTHAVATARS_FILE = "youthavatars";
export const YOUTHAVATARS_VERSION = "1.2";

export interface YouthPlayerAvatar {
  playerId: number;
  avatar: Avatar;
}

export function mapYouthAvatars(root: HattrickData): YouthPlayerAvatar[] {
  const yt = rec(root["YouthTeam"]);
  return asArray<R>(rec(yt["YouthPlayers"])["YouthPlayer"]).map((p) => ({
    playerId: num(p["YouthPlayerID"]),
    avatar: mapAvatarLocal(rec(p["Avatar"])),
  }));
}

// ===========================================================================
// worldlanguages (1.2)
// ===========================================================================
export const WORLDLANGUAGES_FILE = "worldlanguages";
export const WORLDLANGUAGES_VERSION = "1.2";

export interface WorldLanguage {
  id: number;
  name: string;
}

export function mapWorldLanguages(root: HattrickData): WorldLanguage[] {
  return asArray<R>(rec(root["LanguageList"])["Language"]).map((l) => ({
    id: num(l["LanguageID"]),
    name: str(l["LanguageName"]),
  }));
}

// ===========================================================================
// bookmarks (1.0)
// ===========================================================================
export const BOOKMARKS_FILE = "bookmarks";
export const BOOKMARKS_VERSION = "1.0";

export interface Bookmark {
  bookmarkId: string;
  bookmarkType: number;
  text: string;
  text2: string;
  objectId: string;
  objectId2: string;
  objectId3: string;
  comment: string;
}

export function mapBookmarks(root: HattrickData): Bookmark[] {
  return asArray<R>(rec(root["BookmarkList"])["Bookmark"]).map((b) => ({
    bookmarkId: str(b["BookmarkID"]),
    bookmarkType: num(b["BookmarkTypeID"]),
    text: str(b["Text"]),
    text2: str(b["Text2"]),
    objectId: str(b["ObjectID"]),
    objectId2: str(b["ObjectID2"]),
    objectId3: str(b["ObjectID3"]),
    comment: str(b["Comment"]),
  }));
}

// ===========================================================================
// achievements (1.2)
// ===========================================================================
export const ACHIEVEMENTS_FILE = "achievements";
export const ACHIEVEMENTS_VERSION = "1.2";

export interface Achievement {
  id: number;
  title: string;
  text: string;
  category: number;
  eventDate: string;
  points: number;
  multiLevel: boolean;
  rank: number;
  numberOfEvents: number;
}

export function mapAchievements(root: HattrickData): Achievement[] {
  return asArray<R>(rec(root["AchievementList"])["Achievement"]).map((a) => ({
    id: num(a["AchievementTypeID"]),
    title: str(a["AchievementTitle"]),
    text: str(a["AchievementText"]),
    category: num(a["CategoryID"]),
    eventDate: str(a["EventDate"]),
    points: num(a["Points"]),
    multiLevel: bool(a["Multilevel"]),
    rank: num(a["Rank"]),
    numberOfEvents: num(a["NumberOfEvents"]),
  }));
}

// ===========================================================================
// search (1.2)
// ===========================================================================
export const SEARCH_FILE = "search";
export const SEARCH_VERSION = "1.2";

export interface SearchResult {
  id: number;
  name: string;
}

export function mapSearch(root: HattrickData): SearchResult[] {
  return asArray<R>(root["Result"]).map((r) => ({
    id: num(r["ResultID"]),
    name: str(r["ResultName"]),
  }));
}

// ===========================================================================
// translations (1.2)
// ===========================================================================
export const TRANSLATIONS_FILE = "translations";
export const TRANSLATIONS_VERSION = "1.2";

export interface TransValue {
  value: string;
  text: string;
}
export interface TransTypeValue {
  type: string;
  text: string;
}
export interface Translations {
  languageId: number;
  languageName: string;
  skillNames: TransTypeValue[];
  skillLevels: TransValue[];
  skillSubLevels: TransValue[];
  playerSpecialties: TransValue[];
  playerAgreeability: TransValue[];
  playerAggressiveness: TransValue[];
  playerHonesty: TransValue[];
  tacticTypes: TransValue[];
  matchPositions: TransTypeValue[];
  ratingSectors: TransTypeValue[];
  teamAttitude: TransValue[];
  teamSpirit: TransValue[];
  confidence: TransValue[];
  trainingTypes: TransValue[];
  sponsors: TransValue[];
  fanMood: TransValue[];
  fanMatchExpectations: TransValue[];
  fanSeasonExpectations: TransValue[];
  leagueNames: { leagueId: number; localLeagueName: string; languageLeagueName: string }[];
}

function transValues(container: unknown, child: string): TransValue[] {
  return asArray<R>(rec(container)[child]).map((i) => ({
    value: str(i["@_Value"]),
    text: str(chardata(i)),
  }));
}
function transTypeValues(container: unknown, child: string): TransTypeValue[] {
  return asArray<R>(rec(container)[child]).map((i) => ({
    type: str(i["@_Type"]),
    text: str(chardata(i)),
  }));
}

export function mapTranslations(root: HattrickData): Translations {
  const texts = rec(root["Texts"]);
  const lang = rec(root["Language"]);
  return {
    languageId: num(lang["@_Id"]),
    languageName: str(chardata(root["Language"])),
    skillNames: transTypeValues(texts["SkillNames"], "Skill"),
    skillLevels: transValues(texts["SkillLevels"], "Level"),
    skillSubLevels: transValues(texts["SkillSubLevels"], "SubLevel"),
    playerSpecialties: transValues(texts["PlayerSpecialties"], "Item"),
    playerAgreeability: transValues(texts["PlayerAgreeability"], "Level"),
    playerAggressiveness: transValues(texts["PlayerAgressiveness"], "Level"),
    playerHonesty: transValues(texts["PlayerHonesty"], "Level"),
    tacticTypes: transValues(texts["TacticTypes"], "Item"),
    matchPositions: transTypeValues(texts["MatchPositions"], "Item"),
    ratingSectors: transTypeValues(texts["RatingSectors"], "Item"),
    teamAttitude: transValues(texts["TeamAttitude"], "Level"),
    teamSpirit: transValues(texts["TeamSpirit"], "Level"),
    confidence: transValues(texts["Confidence"], "Level"),
    trainingTypes: transValues(texts["TrainingTypes"], "Item"),
    sponsors: transValues(texts["Sponsors"], "Level"),
    fanMood: transValues(texts["FanMood"], "Level"),
    fanMatchExpectations: transValues(texts["FanMatchExpectations"], "Level"),
    fanSeasonExpectations: transValues(texts["FanSeasonExpectations"], "Level"),
    leagueNames: asArray<R>(rec(texts["LeagueNames"])["League"]).map((l) => ({
      leagueId: num(l["LeagueId"]),
      localLeagueName: str(l["LocalLeagueName"]),
      languageLeagueName: str(l["LanguageLeagueName"]),
    })),
  };
}

// ===========================================================================
// worlddetails (2.0)
// ===========================================================================
export const WORLDDETAILS_FILE = "worlddetails";
export const WORLDDETAILS_VERSION = "2.0";

export interface LeagueCup {
  id: number;
  name: string;
  cupLeagueLevel: number;
  cupLevel: number;
  cupLevelIndex: number;
  matchRound: number;
  matchRoundsLeft: number;
}
export interface League {
  id: number;
  name: string;
  season: number;
  seasonOffset: number;
  matchRound: number;
  shortName: string;
  continent: string;
  zoneName: string;
  englishName: string;
  leagueSystemId: number;
  languageId: number;
  languageName: string;
  countryId: number;
  countryName: string;
  currencyName: string;
  currencyRate: number;
  countryCode: string;
  dateFormat: string;
  timeFormat: string;
  regions: { id: number; name: string }[];
  cups: LeagueCup[];
  nationalTeamId: number;
  u20TeamId: number;
  activeTeams: number;
  activeUsers: number;
  waitingUsers: number;
  trainingDate: string;
  economyDate: string;
  cupMatchDate: string;
  seriesMatchDate: string;
  numberOfLevels: number;
}

function mapLeague(l: R): League {
  const c = rec(l["Country"]);
  return {
    id: num(l["LeagueID"]),
    name: str(l["LeagueName"]),
    season: num(l["Season"]),
    seasonOffset: num(l["SeasonOffset"]),
    matchRound: num(l["MatchRound"]),
    shortName: str(l["ShortName"]),
    continent: str(l["Continent"]),
    zoneName: str(l["ZoneName"]),
    englishName: str(l["EnglishName"]),
    leagueSystemId: num(l["LeagueSystemID"]),
    languageId: num(l["LanguageId"]),
    languageName: str(l["LanguageName"]),
    countryId: num(c["CountryID"]),
    countryName: str(c["CountryName"]),
    currencyName: str(c["CurrencyName"]),
    currencyRate: num(c["CurrencyRate"]),
    countryCode: str(c["CountryCode"]),
    dateFormat: str(c["DateFormat"]),
    timeFormat: str(c["TimeFormat"]),
    regions: asArray<R>(rec(c["RegionList"])["Region"]).map((r) => ({
      id: num(r["RegionID"]),
      name: str(r["RegionName"]),
    })),
    cups: asArray<R>(rec(l["Cups"])["Cup"]).map((cp) => ({
      id: num(cp["CupID"]),
      name: str(cp["CupName"]),
      cupLeagueLevel: num(cp["CupLeagueLevel"]),
      cupLevel: num(cp["CupLevel"]),
      cupLevelIndex: num(cp["CupLevelIndex"]),
      matchRound: num(cp["MatchRound"]),
      matchRoundsLeft: num(cp["MatchRoundsLeft"]),
    })),
    nationalTeamId: num(l["NationalTeamId"]),
    u20TeamId: num(l["U20teamId"]),
    activeTeams: num(l["ActiveTeams"]),
    activeUsers: num(l["ActiveUsers"]),
    waitingUsers: num(l["WaitingUsers"]),
    trainingDate: str(l["TrainingDate"]),
    economyDate: str(l["EconomyDate"]),
    cupMatchDate: str(l["CupMatchDate"]),
    seriesMatchDate: str(l["SeriesMatchDate"]),
    numberOfLevels: num(l["NumberOfLevels"]),
  };
}

export function mapWorldDetails(root: HattrickData): League[] {
  return asArray<R>(rec(root["LeagueList"])["League"]).map(mapLeague);
}

// ===========================================================================
// managercompendium (1.7)
// ===========================================================================
export const MANAGERCOMPENDIUM_FILE = "managercompendium";
export const MANAGERCOMPENDIUM_VERSION = "1.7";

export interface ManagerTeam {
  id: number;
  name: string;
  gender: number;
  leagueSystemId: number;
  arenaId: number;
  arenaName: string;
  leagueId: number;
  leagueName: string;
  leagueSeason: number;
  countryId: number;
  countryName: string;
  seriesId: number;
  seriesName: string;
  leagueLevel: number;
  regionId: number;
  regionName: string;
  youthTeamId: number;
  youthTeamName: string;
  youthLeagueId: number;
  youthLeagueName: string;
}
export interface Manager {
  id: number;
  loginName: string;
  supporterTier: number;
  lastLogins: string[];
  languageId: number;
  languageName: string;
  countryId: number;
  countryName: string;
  currencyName: string;
  currencyRate: number;
  avatar: Avatar;
  teams: ManagerTeam[];
  nationalTeamCoachId: number;
  nationalTeamCoachName: string;
  nationalTeamAssistantId: number;
  nationalTeamAssistantName: string;
}

export function mapManager(root: HattrickData): Manager {
  const m = rec(root["Manager"]);
  const lang = rec(m["Language"]);
  const cty = rec(m["Country"]);
  const cur = rec(m["Currency"]);
  const ntc = rec(rec(m["NationalTeamCoach"])["NationalTeam"]);
  const nta = rec(rec(m["NationalTeamAssistant"])["NationalTeam"]);
  return {
    id: num(m["UserId"]),
    loginName: str(m["Loginname"]),
    supporterTier: num(m["SupporterTier"]),
    lastLogins: asArray<unknown>(rec(m["LastLogins"])["LoginTime"]).map((x) => str(x)),
    languageId: num(lang["LanguageId"]),
    languageName: str(lang["LanguageName"]),
    countryId: num(cty["CountryId"]),
    countryName: str(cty["CountryName"]),
    currencyName: str(cur["CurrencyName"]),
    currencyRate: num(cur["CurrencyRate"]),
    avatar: mapAvatarLocal(rec(m["Avatar"])),
    teams: asArray<R>(rec(m["Teams"])["Team"]).map((t) => {
      const lg = rec(t["League"]);
      const sr = rec(t["LeagueLevelUnit"]);
      const yt = rec(t["YouthTeam"]);
      return {
        id: num(t["TeamId"]),
        name: str(t["TeamName"]),
        gender: num(t["GenderID"]),
        leagueSystemId: num(t["LeagueSystemID"]),
        arenaId: num(rec(t["Arena"])["ArenaId"]),
        arenaName: str(rec(t["Arena"])["ArenaName"]),
        leagueId: num(lg["LeagueId"]),
        leagueName: str(lg["LeagueName"]),
        leagueSeason: num(lg["Season"]),
        countryId: num(rec(t["Country"])["CountryId"]),
        countryName: str(rec(t["Country"])["CountryName"]),
        seriesId: num(sr["LeagueLevelUnitId"]),
        seriesName: str(sr["LeagueLevelUnitName"]),
        leagueLevel: num(sr["LeagueLevel"]),
        regionId: num(rec(t["Region"])["RegionId"]),
        regionName: str(rec(t["Region"])["RegionName"]),
        youthTeamId: num(yt["YouthTeamId"]),
        youthTeamName: str(yt["YouthTeamName"]),
        youthLeagueId: num(rec(yt["YouthLeague"])["YouthLeagueId"]),
        youthLeagueName: str(rec(yt["YouthLeague"])["YouthLeagueName"]),
      };
    }),
    nationalTeamCoachId: num(ntc["NationalTeamId"]),
    nationalTeamCoachName: str(ntc["NationalTeamName"]),
    nationalTeamAssistantId: num(nta["NationalTeamId"]),
    nationalTeamAssistantName: str(nta["NationalTeamName"]),
  };
}

// ===========================================================================
// leaguedetails / series standings (1.6)
// ===========================================================================
export const LEAGUEDETAILS_FILE = "leaguedetails";
export const LEAGUEDETAILS_VERSION = "1.6";

export interface SeriesTeam {
  userId: number;
  id: number;
  name: string;
  position: number;
  positionChange: number;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  won: number;
  draws: number;
  lost: number;
}
export interface Series {
  id: number;
  name: string;
  leagueId: number;
  leagueName: string;
  leagueLevel: number;
  maxLevel: number;
  currentMatchRound: string;
  rank: number;
  teams: SeriesTeam[];
}

export function mapSeries(root: HattrickData): Series {
  return {
    id: num(root["LeagueLevelUnitID"]),
    name: str(root["LeagueLevelUnitName"]),
    leagueId: num(root["LeagueID"]),
    leagueName: str(root["LeagueName"]),
    leagueLevel: num(root["LeagueLevel"]),
    maxLevel: num(root["MaxLevel"]),
    currentMatchRound: str(root["CurrentMatchRound"]),
    rank: num(root["Rank"]),
    teams: asArray<R>(root["Team"]).map((t) => ({
      userId: num(t["UserId"]),
      id: num(t["TeamID"]),
      name: str(t["TeamName"]),
      position: num(t["Position"]),
      positionChange: num(t["PositionChange"]),
      matches: num(t["Matches"]),
      goalsFor: num(t["GoalsFor"]),
      goalsAgainst: num(t["GoalsAgainst"]),
      points: num(t["Points"]),
      won: num(t["Won"]),
      draws: num(t["Draws"]),
      lost: num(t["Lost"]),
    })),
  };
}

// ===========================================================================
// leaguefixtures / series fixtures (1.2)
// ===========================================================================
export const LEAGUEFIXTURES_FILE = "leaguefixtures";
export const LEAGUEFIXTURES_VERSION = "1.2";

export interface SeriesMatch {
  id: number;
  round: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  date: string;
  homeGoals: number;
  awayGoals: number;
}
export interface SeriesFixtures {
  seriesId: number;
  seriesName: string;
  season: number;
  matches: SeriesMatch[];
}

export function mapSeriesFixtures(root: HattrickData): SeriesFixtures {
  return {
    seriesId: num(root["LeagueLevelUnitID"]),
    seriesName: str(root["LeagueLevelUnitName"]),
    season: num(root["Season"]),
    matches: asArray<R>(root["Match"]).map((m) => ({
      id: num(m["MatchID"]),
      round: num(m["MatchRound"]),
      homeTeamId: num(rec(m["HomeTeam"])["HomeTeamID"]),
      homeTeamName: str(rec(m["HomeTeam"])["HomeTeamName"]),
      awayTeamId: num(rec(m["AwayTeam"])["AwayTeamID"]),
      awayTeamName: str(rec(m["AwayTeam"])["AwayTeamName"]),
      date: str(m["MatchDate"]),
      homeGoals: num(m["HomeGoals"]),
      awayGoals: num(m["AwayGoals"]),
    })),
  };
}

// ===========================================================================
// youthteamdetails (1.4)
// ===========================================================================
export const YOUTHTEAMDETAILS_FILE = "youthteamdetails";
export const YOUTHTEAMDETAILS_VERSION = "1.4";

export interface YouthScout {
  id: number;
  name: string;
  age: number;
  countryId: number;
  countryName: string;
  regionId: number;
  regionName: string;
  inCountryId: number;
  inRegionId: number;
  hiredDate: string;
  lastCalled: string;
  playerTypeSearch: number;
  hofPlayerId: number;
  travelStartDate: string;
  travelLength: number;
  travelType: number;
}
export interface YouthTeamDetails {
  id: number;
  name: string;
  shortName: string;
  createdDate: string;
  ownerUserId: number;
  gender: number;
  leagueSystemId: number;
  countryId: number;
  countryName: string;
  regionId: number;
  regionName: string;
  arenaId: number;
  arenaName: string;
  leagueId: number;
  leagueName: string;
  leagueStatus: number;
  motherTeamId: number;
  motherTeamName: string;
  trainerId: number;
  nextTrainingMatchDate: string;
  scouts: YouthScout[];
}

export function mapYouthTeamDetails(root: HattrickData): YouthTeamDetails {
  const t = rec(root["YouthTeam"]);
  const lg = rec(t["YouthLeague"]);
  const ot = rec(t["OwningTeam"]);
  return {
    id: num(t["YouthTeamID"]),
    name: str(t["YouthTeamName"]),
    shortName: str(t["ShortTeamName"]),
    createdDate: str(t["CreatedDate"]),
    ownerUserId: num(t["UserID"]),
    gender: num(t["GenderID"]),
    leagueSystemId: num(t["LeagueSystemID"]),
    countryId: num(rec(t["Country"])["CountryID"]),
    countryName: str(rec(t["Country"])["CountryName"]),
    regionId: num(rec(t["Region"])["RegionID"]),
    regionName: str(rec(t["Region"])["RegionName"]),
    arenaId: num(rec(t["YouthArena"])["YouthArenaID"]),
    arenaName: str(rec(t["YouthArena"])["YouthArenaName"]),
    leagueId: num(lg["YouthLeagueID"]),
    leagueName: str(lg["YouthLeagueName"]),
    leagueStatus: num(lg["YouthLeagueStatus"]),
    motherTeamId: num(ot["MotherTeamID"]),
    motherTeamName: str(ot["MotherTeamName"]),
    trainerId: num(rec(t["YouthTrainer"])["YouthPlayerID"]),
    nextTrainingMatchDate: str(t["NextTrainingMatchDate"]),
    scouts: asArray<R>(rec(t["ScoutList"])["Scout"]).map((s) => {
      const tv = rec(s["Travel"]);
      return {
        id: num(s["YouthScoutID"]),
        name: str(s["ScoutName"]),
        age: num(s["Age"]),
        countryId: num(rec(s["Country"])["CountryID"]),
        countryName: str(rec(s["Country"])["CountryName"]),
        regionId: num(rec(s["Region"])["RegionID"]),
        regionName: str(rec(s["Region"])["RegionName"]),
        inCountryId: num(rec(s["InCountry"])["CountryID"]),
        inRegionId: num(rec(s["InRegion"])["RegionID"]),
        hiredDate: str(s["HiredDate"]),
        lastCalled: str(s["LastCalled"]),
        playerTypeSearch: num(s["PlayerTypeSearch"]),
        hofPlayerId: num(s["HofPlayerId"]),
        travelStartDate: str(tv["TravelStartDate"]),
        travelLength: num(tv["TravelLength"]),
        travelType: num(tv["TravelType"]),
      };
    }),
  };
}

// ===========================================================================
// youthplayerlist (1.3) / youthplayerdetails (1.3) — shared YouthPlayerDetail
// ===========================================================================
export const YOUTHPLAYERLIST_FILE = "youthplayerlist";
export const YOUTHPLAYERLIST_VERSION = "1.3";
export const YOUTHPLAYERDETAILS_FILE = "youthplayerdetails";
export const YOUTHPLAYERDETAILS_VERSION = "1.3";

export interface YouthSkill {
  value: number;
  available: boolean;
  isMaxReached: boolean;
  mayUnlock: boolean;
}
export interface YouthScoutComment {
  text: string;
  type: number;
  variation: number;
  skillType: number;
  skillLevel: number;
}
export interface YouthPlayer {
  id: number;
  firstName: string;
  nickName: string;
  lastName: string;
  age: number;
  ageDays: number;
  gender: number;
  arrivalDate: string;
  canBePromotedIn: number;
  number: number;
  statement: string;
  nativeCountryId: number;
  nativeCountryName: string;
  ownerNotes: string;
  categoryId: number;
  cards: number;
  injuryLevel: number;
  specialtyId: number;
  careerGoals: number;
  careerHattricks: number;
  leagueGoals: number;
  friendlyGoals: number;
  youthTeamId: number;
  youthTeamName: string;
  seniorTeamId: number;
  seniorTeamName: string;
  skills: Record<string, YouthSkill>;
  scoutComments: YouthScoutComment[];
  lastMatch?: {
    date: string;
    youthMatchId: number;
    positionCode: number;
    playedMinutes: number;
    rating: number;
  };
}

function mapYouthSkill(v: unknown): YouthSkill {
  const r = rec(v);
  return {
    value: num(chardata(v)),
    available: bool(r["@_IsAvailable"]),
    isMaxReached: bool(r["@_IsMaxReached"]),
    mayUnlock: bool(r["@_MayUnlock"]),
  };
}

export function mapYouthPlayer(p: R): YouthPlayer {
  const ot = rec(p["OwningYouthTeam"]);
  const sk = rec(p["PlayerSkills"]);
  const out: YouthPlayer = {
    id: num(p["YouthPlayerID"]),
    firstName: str(p["FirstName"]),
    nickName: str(p["NickName"]),
    lastName: str(p["LastName"]),
    age: num(p["Age"]),
    ageDays: num(p["AgeDays"]),
    gender: num(p["GenderID"]),
    arrivalDate: str(p["ArrivalDate"]),
    canBePromotedIn: num(p["CanBePromotedIn"]),
    number: num(p["PlayerNumber"]),
    statement: str(p["Statement"]),
    nativeCountryId: num(p["NativeCountryID"]),
    nativeCountryName: str(p["NativeCountryName"]),
    ownerNotes: str(p["OwnerNotes"]),
    categoryId: num(p["PlayerCategoryID"]),
    cards: num(p["Cards"]),
    injuryLevel: num(p["InjuryLevel"]),
    specialtyId: num(p["Specialty"]),
    careerGoals: num(p["CareerGoals"]),
    careerHattricks: num(p["CareerHattricks"]),
    leagueGoals: num(p["LeagueGoals"]),
    friendlyGoals: num(p["FriendlyGoals"]),
    youthTeamId: num(ot["YouthTeamID"]),
    youthTeamName: str(ot["YouthTeamName"]),
    seniorTeamId: num(rec(ot["SeniorTeam"])["SeniorTeamID"]),
    seniorTeamName: str(rec(ot["SeniorTeam"])["SeniorTeamName"]),
    skills: {
      keeper: mapYouthSkill(sk["KeeperSkill"]),
      keeperMax: mapYouthSkill(sk["KeeperSkillMax"]),
      defender: mapYouthSkill(sk["DefenderSkill"]),
      defenderMax: mapYouthSkill(sk["DefenderSkillMax"]),
      playmaker: mapYouthSkill(sk["PlaymakerSkill"]),
      playmakerMax: mapYouthSkill(sk["PlaymakerSkillMax"]),
      winger: mapYouthSkill(sk["WingerSkill"]),
      wingerMax: mapYouthSkill(sk["WingerSkillMax"]),
      scorer: mapYouthSkill(sk["ScorerSkill"]),
      scorerMax: mapYouthSkill(sk["ScorerSkillMax"]),
      passing: mapYouthSkill(sk["PassingSkill"]),
      passingMax: mapYouthSkill(sk["PassingSkillMax"]),
      setPieces: mapYouthSkill(sk["SetPiecesSkill"]),
      setPiecesMax: mapYouthSkill(sk["SetPiecesSkillMax"]),
    },
    scoutComments: asArray<R>(rec(rec(p["ScoutCall"])["ScoutComments"])["ScoutComment"]).map(
      (c) => ({
        text: str(c["CommentText"]),
        type: num(c["CommentType"]),
        variation: num(c["CommentVariation"]),
        skillType: num(c["CommentSkillType"]),
        skillLevel: num(c["CommentSkillLevel"]),
      }),
    ),
  };
  if (p["LastMatch"]) {
    const lm = rec(p["LastMatch"]);
    out.lastMatch = {
      date: str(lm["Date"]),
      youthMatchId: num(lm["YouthMatchID"]),
      positionCode: num(lm["PositionCode"]),
      playedMinutes: num(lm["PlayedMinutes"]),
      rating: num(lm["Rating"]),
    };
  }
  return out;
}

export function mapYouthPlayerList(root: HattrickData): YouthPlayer[] {
  return asArray<R>(rec(root["PlayerList"])["YouthPlayer"]).map(mapYouthPlayer);
}
export function mapYouthPlayerDetails(root: HattrickData): YouthPlayer {
  return mapYouthPlayer(rec(root["YouthPlayer"]));
}

// ===========================================================================
// youthleaguedetails (1.1)
// ===========================================================================
export const YOUTHLEAGUEDETAILS_FILE = "youthleaguedetails";
export const YOUTHLEAGUEDETAILS_VERSION = "1.1";

export interface YouthLeagueTeam {
  id: number;
  name: string;
  position: number;
  positionChange: number;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  won: number;
  draws: number;
  lost: number;
}
export interface YouthLeagueDetails {
  id: number;
  name: string;
  type: number;
  season: number;
  lastMatchRound: number;
  nrOfTeamsInLeague: number;
  leagueSystemId: number;
  teams: YouthLeagueTeam[];
}

export function mapYouthLeagueDetails(root: HattrickData): YouthLeagueDetails {
  return {
    id: num(root["YouthLeagueID"]),
    name: str(root["YouthLeagueName"]),
    type: num(root["YouthLeagueType"]),
    season: num(root["Season"]),
    lastMatchRound: num(root["LastMatchRound"]),
    nrOfTeamsInLeague: num(root["NrOfTeamsInLeague"]),
    leagueSystemId: num(root["LeagueSystemID"]),
    teams: asArray<R>(rec(root["Teams"])["Team"]).map((t) => ({
      id: num(t["TeamID"]),
      name: str(t["TeamName"]),
      position: num(t["Position"]),
      positionChange: num(t["PositionChange"]),
      matches: num(t["Matches"]),
      goalsFor: num(t["GoalsFor"]),
      goalsAgainst: num(t["GoalsAgainst"]),
      points: num(t["Points"]),
      won: num(t["Won"]),
      draws: num(t["Draws"]),
      lost: num(t["Lost"]),
    })),
  };
}

// ===========================================================================
// youthleaguefixtures (1.0)
// ===========================================================================
export const YOUTHLEAGUEFIXTURES_FILE = "youthleaguefixtures";
export const YOUTHLEAGUEFIXTURES_VERSION = "1.0";

export interface YouthLeagueFixture {
  matchId: number;
  matchRound: number;
  status: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: string;
  homeGoals: number;
  awayGoals: number;
}
export interface YouthLeagueFixtures {
  youthLeagueId: number;
  youthLeagueName: string;
  youthLeagueType: number;
  season: number;
  lastMatchRound: number;
  nrOfTeamsInLeague: number;
  matches: YouthLeagueFixture[];
}

export function mapYouthLeagueFixtures(root: HattrickData): YouthLeagueFixtures {
  return {
    youthLeagueId: num(root["YouthLeagueID"]),
    youthLeagueName: str(root["YouthLeagueName"]),
    youthLeagueType: num(root["YouthLeagueType"]),
    season: num(root["Season"]),
    lastMatchRound: num(root["LastMatchRound"]),
    nrOfTeamsInLeague: num(root["NrOfTeamsInLeague"]),
    matches: asArray<R>(rec(root["Matches"])["Match"]).map((m) => ({
      matchId: num(m["MatchID"]),
      matchRound: num(m["MatchRound"]),
      status: num(m["Status"]),
      homeTeamId: num(rec(m["HomeTeam"])["HomeTeamID"]),
      homeTeamName: str(rec(m["HomeTeam"])["HomeTeamName"]),
      awayTeamId: num(rec(m["AwayTeam"])["AwayTeamID"]),
      awayTeamName: str(rec(m["AwayTeam"])["AwayTeamName"]),
      matchDate: str(m["MatchDate"]),
      homeGoals: num(m["HomeGoals"]),
      awayGoals: num(m["AwayGoals"]),
    })),
  };
}

// ===========================================================================
// nationalteams (1.6)
// ===========================================================================
export const NATIONALTEAMS_FILE = "nationalteams";
export const NATIONALTEAMS_VERSION = "1.6";

export interface NationalTeamListEntry {
  id: number;
  name: string;
  dress: string;
  ratingScore: number;
  leagueId: number;
}
export interface NationalTeamsList {
  leagueOfficeTypeId: number;
  nationalTeams: NationalTeamListEntry[];
  cupTeams: { id: number; name: string }[];
}

export function mapNationalTeams(root: HattrickData): NationalTeamsList {
  const cups = asArray<R>(rec(root["Cups"])["Cup"]);
  const cupTeams: { id: number; name: string }[] = [];
  for (const c of cups) {
    for (const t of asArray<R>(rec(c["CupTeams"])["CupTeam"])) {
      cupTeams.push({ id: num(t["CupNationalTeamID"]), name: str(t["CupNationalTeamName"]) });
    }
  }
  return {
    leagueOfficeTypeId: num(root["LeagueOfficeTypeID"]),
    nationalTeams: asArray<R>(rec(root["NationalTeams"])["NationalTeam"]).map((t) => ({
      id: num(t["NationalTeamID"]),
      name: str(t["NationalTeamName"]),
      dress: str(t["Dress"]),
      ratingScore: num(t["RatingScore"]),
      leagueId: num(t["LeagueID"]),
    })),
    cupTeams,
  };
}

// ===========================================================================
// nationalteamdetails (1.9)
// ===========================================================================
export const NATIONALTEAMDETAILS_FILE = "nationalteamdetails";
export const NATIONALTEAMDETAILS_VERSION = "1.9";

export interface NationalTeamDetails {
  id: number;
  name: string;
  coachUserId: number;
  coachLoginName: string;
  leagueId: number;
  leagueName: string;
  homePage: string;
  logo: string;
  dressUri: string;
  dressAlternateUri: string;
  experience: Record<string, number>;
  morale: number;
  selfConfidence: number;
  supportersPopularity: number;
  ratingScore: number;
  fanClubSize: number;
  rank: number;
}

export function mapNationalTeamDetails(root: HattrickData): NationalTeamDetails {
  const t = rec(root["Team"]);
  const coach = rec(t["NationalCoach"]);
  const lg = rec(t["League"]);
  return {
    id: num(t["TeamID"]),
    name: str(t["TeamName"]),
    coachUserId: num(coach["NationalCoachUserID"]),
    coachLoginName: str(coach["NationalCoachLoginname"]),
    leagueId: num(lg["LeagueID"]),
    leagueName: str(lg["LeagueName"]),
    homePage: str(t["HomePage"]),
    logo: str(t["Logo"]),
    dressUri: str(t["DressURI"]),
    dressAlternateUri: str(t["DressAlternateURI"]),
    experience: {
      "442": num(t["Experience442"]),
      "433": num(t["Experience433"]),
      "451": num(t["Experience451"]),
      "352": num(t["Experience352"]),
      "532": num(t["Experience532"]),
      "343": num(t["Experience343"]),
      "541": num(t["Experience541"]),
      "523": num(t["Experience523"]),
      "550": num(t["Experience550"]),
      "253": num(t["Experience253"]),
    },
    morale: num(t["Morale"]),
    selfConfidence: num(t["SelfConfidence"]),
    supportersPopularity: num(chardata(t["SupportersPopularity"])),
    ratingScore: num(t["RatingScore"]),
    fanClubSize: num(t["FanClubSize"]),
    rank: num(t["Rank"]),
  };
}

// ===========================================================================
// nationalplayers (1.5)
// ===========================================================================
export const NATIONALPLAYERS_FILE = "nationalplayers";
export const NATIONALPLAYERS_VERSION = "1.5";

export interface NationalTeamPlayer {
  playerId: number;
  name: string;
  cards: number;
  specialtyId: number;
  avatar: Avatar;
}
export interface NationalPlayerStat {
  playerId: number;
  name: string;
  nrOfMatches: number;
}
export interface NationalPlayersStats {
  matchTypeCategory: string;
  showAll: boolean;
  moreRecordsAvailable: boolean;
  players: NationalPlayerStat[];
}

export function mapNationalPlayers(root: HattrickData): NationalTeamPlayer[] {
  return asArray<R>(rec(root["Players"])["Player"]).map((p) => ({
    playerId: num(p["PlayerID"]),
    name: str(p["PlayerName"]),
    cards: num(p["Cards"]),
    specialtyId: num(p["Specialty"]),
    avatar: mapAvatarLocal(rec(p["Avatar"])),
  }));
}
export function mapNationalPlayersStats(root: HattrickData): NationalPlayersStats {
  const s = rec(root["Stats"]);
  return {
    matchTypeCategory: str(s["MatchTypeCategory"]),
    showAll: bool(s["ShowAll"]),
    moreRecordsAvailable: bool(s["MoreRecordsAvailable"]),
    players: asArray<R>(rec(s["Players"])["Player"]).map((p) => ({
      playerId: num(p["PlayerID"]),
      name: str(p["PlayerName"]),
      nrOfMatches: num(p["NrOfMatches"]),
    })),
  };
}

// ===========================================================================
// nationalteammatches (1.4)
// ===========================================================================
export const NATIONALTEAMMATCHES_FILE = "nationalteammatches";
export const NATIONALTEAMMATCHES_VERSION = "1.4";

export interface NationalTeamMatch {
  matchId: number;
  matchDate: string;
  matchType: number;
  matchContextId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
}

export function mapNationalTeamMatches(root: HattrickData): NationalTeamMatch[] {
  return asArray<R>(rec(root["Matches"])["Match"]).map((m) => {
    const res = rec(m["MatchResult"]);
    return {
      matchId: num(m["MatchID"]),
      matchDate: str(m["MatchDate"]),
      matchType: num(m["MatchType"]),
      matchContextId: num(m["MatchContextId"]),
      homeTeamId: num(m["HomeTeamId"]),
      homeTeamName: str(m["HomeTeamName"]),
      awayTeamId: num(m["AwayTeamId"]),
      awayTeamName: str(m["AwayTeamName"]),
      homeGoals: num(res["HomeGoals"]),
      awayGoals: num(res["AwayGoals"]),
    };
  });
}

// ===========================================================================
// worldcup (1.1)
// ===========================================================================
export const WORLDCUP_FILE = "worldcup";
export const WORLDCUP_VERSION = "1.1";

export interface WorldCupScore {
  teamId: number;
  teamName: string;
  place: number;
  cupSeriesUnitId: number;
  cupSeriesUnitName: string;
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}
export interface WorldCupMatch {
  matchId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: string;
  finishedDate: string;
  homeGoals: number;
  awayGoals: number;
}

export function mapWorldCupScores(root: HattrickData): WorldCupScore[] {
  return asArray<R>(rec(root["WorldCupScores"])["Team"]).map((t) => ({
    teamId: num(t["TeamID"]),
    teamName: str(t["TeamName"]),
    place: num(t["Place"]),
    cupSeriesUnitId: num(t["CupSeriesUnitID"]),
    cupSeriesUnitName: str(t["CupSeriesUnitName"]),
    matchesPlayed: num(t["MatchesPlayed"]),
    goalsFor: num(t["GoalsFor"]),
    goalsAgainst: num(t["GoalsAgainst"]),
    points: num(t["Points"]),
  }));
}
export function mapWorldCupMatches(root: HattrickData): WorldCupMatch[] {
  return asArray<R>(rec(root["Matches"])["Match"]).map((m) => ({
    matchId: num(m["MatchID"]),
    homeTeamId: num(rec(m["HomeTeam"])["TeamID"]),
    homeTeamName: str(rec(m["HomeTeam"])["TeamName"]),
    awayTeamId: num(rec(m["AwayTeam"])["TeamID"]),
    awayTeamName: str(rec(m["AwayTeam"])["TeamName"]),
    matchDate: str(m["MatchDate"]),
    finishedDate: str(m["FinishedDate"]),
    homeGoals: num(m["HomeGoals"]),
    awayGoals: num(m["AwayGoals"]),
  }));
}

// ===========================================================================
// tournamentlist (1.0) / tournamentdetails (1.0)
// ===========================================================================
export const TOURNAMENTLIST_FILE = "tournamentlist";
export const TOURNAMENTLIST_VERSION = "1.0";
export const TOURNAMENTDETAILS_FILE = "tournamentdetails";
export const TOURNAMENTDETAILS_VERSION = "1.0";

export interface Tournament {
  id: number;
  name: string;
  type: number;
  season: number;
  logoUrl: string;
  trophyType: number;
  numberOfTeams: number;
  numberOfGroups: number;
  lastMatchRound: number;
  firstMatchRoundDate: string;
  nextMatchRoundDate: string;
  isMatchesOngoing: boolean;
  creatorUserId: number;
  creatorLoginName: string;
}

function mapTournament(t: R): Tournament {
  const c = rec(t["Creator"]);
  return {
    id: num(t["TournamentId"]),
    name: str(t["Name"]),
    type: num(t["TournamentType"]),
    season: num(t["Season"]),
    logoUrl: str(t["LogoUrl"]),
    trophyType: num(t["TrophyType"]),
    numberOfTeams: num(t["NumberOfTeams"]),
    numberOfGroups: num(t["NumberOfGroups"]),
    lastMatchRound: num(t["LastMatchRound"]),
    firstMatchRoundDate: str(t["FirstMatchRoundDate"]),
    nextMatchRoundDate: str(t["NextMatchRoundDate"]),
    isMatchesOngoing: bool(t["IsMatchesOngoing"]),
    creatorUserId: num(c["UserId"]),
    creatorLoginName: str(c["Loginname"]),
  };
}

export function mapTournamentList(root: HattrickData): Tournament[] {
  return asArray<R>(rec(root["Tournaments"])["Tournament"]).map(mapTournament);
}
export function mapTournamentDetails(root: HattrickData): Tournament {
  return mapTournament(rec(root["Tournament"]));
}

// ===========================================================================
// tournamentfixtures (1.1)
// ===========================================================================
export const TOURNAMENTFIXTURES_FILE = "tournamentfixtures";
export const TOURNAMENTFIXTURES_VERSION = "1.1";

export interface TournamentFixture {
  matchId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  matchDate: string;
  matchType: number;
  matchRound: number;
  group: number;
  status: number;
  homeGoals: number;
  awayGoals: number;
}

export function mapTournamentFixtures(root: HattrickData): TournamentFixture[] {
  return asArray<R>(rec(root["Matches"])["Match"]).map((m) => ({
    matchId: num(m["MatchId"]),
    homeTeamId: num(m["HomeTeamId"]),
    homeTeamName: str(m["HomeTeamName"]),
    awayTeamId: num(m["AwayTeamId"]),
    awayTeamName: str(m["AwayTeamName"]),
    matchDate: str(m["MatchDate"]),
    matchType: num(m["MatchType"]),
    matchRound: num(m["MatchRound"]),
    group: num(m["Group"]),
    status: num(m["Status"]),
    homeGoals: num(m["HomeGoals"]),
    awayGoals: num(m["AwayGoals"]),
  }));
}

// ===========================================================================
// tournamentleaguetables (1.1)
// ===========================================================================
export const TOURNAMENTLEAGUETABLES_FILE = "tournamentleaguetables";
export const TOURNAMENTLEAGUETABLES_VERSION = "1.1";

export interface TournamentTableTeam {
  teamId: number;
  teamName: string;
  position: number;
  positionChange: number;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  won: number;
  draws: number;
  lost: number;
}
export interface TournamentLeagueTable {
  groupId: number;
  teams: TournamentTableTeam[];
}

export function mapTournamentLeagueTables(root: HattrickData): TournamentLeagueTable[] {
  return asArray<R>(rec(root["TournamentLeagueTables"])["TournamentLeagueTable"]).map((t) => ({
    groupId: num(t["GroupId"]),
    teams: asArray<R>(rec(t["Teams"])["Team"]).map((x) => ({
      teamId: num(x["TeamID"]),
      teamName: str(x["TeamName"]),
      position: num(x["Position"]),
      positionChange: num(x["PositionChange"]),
      matches: num(x["Matches"]),
      goalsFor: num(x["GoalsFor"]),
      goalsAgainst: num(x["GoalsAgainst"]),
      points: num(x["Points"]),
      won: num(x["Won"]),
      draws: num(x["Draws"]),
      lost: num(x["Lost"]),
    })),
  }));
}

// ===========================================================================
// alliances (1.4) / alliancedetails (1.5)
// ===========================================================================
export const ALLIANCES_FILE = "alliances";
export const ALLIANCES_VERSION = "1.4";
export const ALLIANCEDETAILS_FILE = "alliancedetails";
export const ALLIANCEDETAILS_VERSION = "1.5";

export interface AllianceRole {
  id: number;
  name: string;
  rank: number;
  memberCount: number;
  maxMembers: number;
  requestType: number;
  description: string;
}
export interface AllianceMember {
  userId: number;
  loginName: string;
  roleId: number;
  roleName: string;
  isOnline: boolean;
  membershipDate: string;
}
export interface Alliance {
  id: number;
  name: string;
  description: string;
  abbreviation: string;
  logoUrl: string;
  topRole: string;
  topUserId: number;
  topLoginName: string;
  creationDate: string;
  homePageUrl: string;
  numberOfMembers: number;
  awaitingRequests: number;
  message: string;
  rules: string;
  userRoleId: number;
  userRoleName: string;
  languages: { id: number; name: string }[];
  roles: AllianceRole[];
  members: AllianceMember[];
}

function mapAllianceObj(a: R): Alliance {
  const ur = rec(a["UserRole"]);
  return {
    id: num(a["AllianceID"]),
    name: str(a["AllianceName"]),
    description: str(a["AllianceDescription"]) || str(a["Description"]),
    abbreviation: str(a["Abbreviation"]),
    logoUrl: str(a["LogoURL"]),
    topRole: str(a["TopRole"]),
    topUserId: num(a["TopUserID"]),
    topLoginName: str(a["TopLoginname"]),
    creationDate: str(a["CreationDate"]),
    homePageUrl: str(a["HomePageURL"]),
    numberOfMembers: num(a["NumberOfMembers"]),
    awaitingRequests: num(a["AwaitingRequests"]),
    message: str(a["Message"]),
    rules: str(a["Rules"]),
    userRoleId: num(ur["RoleId"]),
    userRoleName: str(ur["RoleName"]),
    languages: asArray<R>(rec(a["Languages"])["Language"]).map((l) => ({
      id: num(l["LanguageID"]),
      name: str(l["LanguageName"]),
    })),
    roles: asArray<R>(rec(a["Roles"])["Role"]).map((r) => ({
      id: num(r["RoleId"]),
      name: str(r["RoleName"]),
      rank: num(r["RoleRank"]),
      memberCount: num(r["RoleMemberCount"]),
      maxMembers: num(r["RoleMaxMembers"]),
      requestType: num(r["RoleRequestType"]),
      description: str(r["RoleDescription"]),
    })),
    members: asArray<R>(rec(a["Members"])["Member"]).map((m) => ({
      userId: num(m["UserID"]),
      loginName: str(m["Loginname"]),
      roleId: num(m["RoleId"]),
      roleName: str(m["RoleName"]),
      isOnline: bool(m["IsOnline"]),
      membershipDate: str(m["MembershipDate"]),
    })),
  };
}

export function mapAlliances(root: HattrickData): Alliance[] {
  return asArray<R>(rec(root["Alliances"])["Alliance"]).map(mapAllianceObj);
}
export function mapAllianceDetails(root: HattrickData): Alliance {
  return mapAllianceObj(rec(root["Alliance"]));
}

// ===========================================================================
// live (2.3)
// ===========================================================================
export const LIVE_FILE = "live";
export const LIVE_VERSION = "2.3";

export interface LivePlayer {
  playerId: number;
  roleId: number;
  playerName: string;
  behaviour: number;
}
export interface LiveEvent {
  index: number;
  minute: number;
  matchPart: number;
  eventKey: string;
  eventText: string;
  subjectTeamId: number;
  subjectPlayerId: number;
  objectPlayerId: number;
}
export interface LiveMatch {
  index: number;
  sourceSystem: string;
  matchId: number;
  matchType: number;
  matchDate: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
  homeStartingLineup: LivePlayer[];
  awayStartingLineup: LivePlayer[];
  events: LiveEvent[];
  nextEventMinute: number;
  nextEventMatchPart: number;
}

function mapLivePlayers(v: unknown): LivePlayer[] {
  return asArray<R>(rec(v)["Player"]).map((p) => ({
    playerId: num(p["PlayerID"]),
    roleId: num(p["RoleID"]),
    playerName: str(p["PlayerName"]),
    behaviour: num(p["Behaviour"]),
  }));
}

export function mapLiveMatches(root: HattrickData): LiveMatch[] {
  return asArray<R>(rec(root["MatchList"])["Match"]).map((m) => {
    const home = rec(m["HomeTeam"]);
    const away = rec(m["AwayTeam"]);
    return {
      index: num(attr(m, "Index")),
      sourceSystem: str(m["SourceSystem"]),
      matchId: num(m["MatchID"]),
      matchType: num(m["MatchType"]),
      matchDate: str(m["MatchDate"]),
      homeTeamId: num(home["HomeTeamID"]),
      homeTeamName: str(home["HomeTeamName"]),
      awayTeamId: num(away["AwayTeamID"]),
      awayTeamName: str(away["AwayTeamName"]),
      homeGoals: num(m["HomeGoals"]),
      awayGoals: num(m["AwayGoals"]),
      homeStartingLineup: mapLivePlayers(home["StartingLineup"]),
      awayStartingLineup: mapLivePlayers(away["StartingLineup"]),
      events: asArray<R>(rec(m["EventList"])["Event"]).map((e) => ({
        index: num(attr(e, "Index")),
        minute: num(e["Minute"]),
        matchPart: num(e["MatchPart"]),
        eventKey: str(e["EventKey"]),
        eventText: str(e["EventText"]),
        subjectTeamId: num(e["SubjectTeamID"]),
        subjectPlayerId: num(e["SubjectPlayerID"]),
        objectPlayerId: num(e["ObjectPlayerID"]),
      })),
      nextEventMinute: num(m["NextEventMinute"]),
      nextEventMatchPart: num(m["NextEventMatchPart"]),
    };
  });
}

// ===========================================================================
// trainingevents (1.3)
// ===========================================================================
export const TRAININGEVENTS_FILE = "trainingevents";
export const TRAININGEVENTS_VERSION = "1.3";

export interface TrainingEvent {
  index: number;
  skillId: number;
  oldLevel: number;
  newLevel: number;
  season: number;
  matchRound: number;
  dayNumber: number;
}

export function mapTrainingEvents(root: HattrickData): TrainingEvent[] {
  const ev = rec(rec(root["Player"])["TrainingEvents"]);
  return asArray<R>(ev["TrainingEvent"]).map((e) => ({
    index: num(attr(e, "Index")),
    skillId: num(e["SkillID"]),
    oldLevel: num(e["OldLevel"]),
    newLevel: num(e["NewLevel"]),
    season: num(e["Season"]),
    matchRound: num(e["MatchRound"]),
    dayNumber: num(e["DayNumber"]),
  }));
}

// ===========================================================================
// challenges (1.6) — read side (view + challengeable)
// ===========================================================================
export const CHALLENGES_FILE = "challenges";
export const CHALLENGES_VERSION = "1.6";

export interface Challenge {
  trainingMatchId: number;
  matchTime: string;
  matchId: number;
  friendlyType: number;
  opponentTeamId: number;
  opponentTeamName: string;
  opponentArenaId: number;
  opponentLeagueId: number;
  isAgreed: boolean;
}
export interface Challenges {
  teamId: number;
  teamName: string;
  challengesByMe: Challenge[];
  offersByOthers: Challenge[];
}
export interface ChallengeableResult {
  teamId: number;
  teamName: string;
  isChallengeable: boolean;
}

function mapChallenge(c: R): Challenge {
  const op = rec(c["Opponent"]);
  return {
    trainingMatchId: num(c["TrainingMatchID"]),
    matchTime: str(c["MatchTime"]),
    matchId: num(c["MatchID"]),
    friendlyType: num(c["FriendlyType"]),
    opponentTeamId: num(op["TeamID"]),
    opponentTeamName: str(op["TeamName"]),
    opponentArenaId: num(rec(op["Arena"])["ArenaID"]),
    opponentLeagueId: num(rec(op["League"])["LeagueID"]),
    isAgreed: bool(op["IsAgreed"]),
  };
}

export function mapChallenges(root: HattrickData): Challenges {
  const t = rec(root["Team"]);
  return {
    teamId: num(t["TeamID"]),
    teamName: str(t["TeamName"]),
    challengesByMe: asArray<R>(rec(t["ChallengesByMe"])["Challenge"]).map(mapChallenge),
    offersByOthers: asArray<R>(rec(t["OffersByOthers"])["Offer"]).map(mapChallenge),
  };
}

export function mapChallengeable(root: HattrickData): ChallengeableResult[] {
  const cr = rec(rec(root["Team"])["ChallengeableResult"]);
  return asArray<R>(cr["Opponent"]).map((o) => ({
    teamId: num(o["TeamId"]),
    teamName: str(o["TeamName"]),
    isChallengeable: bool(o["IsChallengeable"]),
  }));
}

// ===========================================================================
// matchorders (3.1) — read side (view current orders)
// ===========================================================================
export const MATCHORDERS_FILE = "matchorders";
export const MATCHORDERS_VERSION = "3.1";

export interface MatchOrdersPlayer {
  playerId: number;
  roleId: number;
  firstName: string;
  nickName: string;
  lastName: string;
  behaviour?: number;
}
export interface MatchOrdersNamedPlayer {
  playerId: number;
  firstName: string;
  nickName: string;
  lastName: string;
}
export interface PlayerOrder {
  playerOrderId: number;
  matchMinuteCriteria: number;
  goalDiffCriteria: number;
  redCardCriteria: number;
  subjectPlayerId: number;
  objectPlayerId: number;
  orderType: number;
  newPositionId: number;
  newPositionBehaviour: number;
  playerOrderExtraInteger: number;
}
export interface MatchOrders {
  available: boolean;
  ordersSet: boolean;
  reason: string;
  tacticSkill: number;
  ratingMidfield: number;
  ratingRightDef: number;
  ratingMidDef: number;
  ratingLeftDef: number;
  ratingRightAtt: number;
  ratingMidAtt: number;
  ratingLeftAtt: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  arenaId: number;
  arenaName: string;
  matchDate: string;
  matchType: number;
  attitude: number;
  tacticType: number;
  coachModifier: number;
  positions: MatchOrdersPlayer[];
  bench: MatchOrdersPlayer[];
  kickers: MatchOrdersPlayer[];
  setPieces?: MatchOrdersNamedPlayer;
  captain?: MatchOrdersNamedPlayer;
  playerOrders: PlayerOrder[];
}

function mapOrdersPlayer(p: R): MatchOrdersPlayer {
  const out: MatchOrdersPlayer = {
    playerId: num(p["PlayerID"]),
    roleId: num(p["RoleID"]),
    firstName: str(p["FirstName"]),
    nickName: str(p["NickName"]),
    lastName: str(p["LastName"]),
  };
  if (p["Behaviour"] !== undefined) out.behaviour = num(p["Behaviour"]);
  return out;
}
function mapNamedPlayer(p: unknown): MatchOrdersNamedPlayer | undefined {
  if (!p) return undefined;
  const r = rec(p);
  if (!r["PlayerID"]) return undefined;
  return {
    playerId: num(r["PlayerID"]),
    firstName: str(r["FirstName"]),
    nickName: str(r["NickName"]),
    lastName: str(r["LastName"]),
  };
}

export function mapMatchOrders(root: HattrickData): MatchOrders {
  const d = rec(root["MatchData"]);
  const lineup = rec(d["Lineup"]);
  return {
    available: bool(attr(d, "Available")),
    ordersSet: bool(attr(d, "OrdersSet")),
    reason: str(d["Reason"]),
    tacticSkill: num(d["TacticSkill"]),
    ratingMidfield: num(d["RatingMidfield"]),
    ratingRightDef: num(d["RatingRightDef"]),
    ratingMidDef: num(d["RatingMidDef"]),
    ratingLeftDef: num(d["RatingLeftDef"]),
    ratingRightAtt: num(d["RatingRightAtt"]),
    ratingMidAtt: num(d["RatingMidAtt"]),
    ratingLeftAtt: num(d["RatingLeftAtt"]),
    homeTeamId: num(rec(d["HomeTeam"])["HomeTeamID"]),
    homeTeamName: str(rec(d["HomeTeam"])["HomeTeamName"]),
    awayTeamId: num(rec(d["AwayTeam"])["AwayTeamID"]),
    awayTeamName: str(rec(d["AwayTeam"])["AwayTeamName"]),
    arenaId: num(rec(d["Arena"])["ArenaID"]),
    arenaName: str(rec(d["Arena"])["ArenaName"]),
    matchDate: str(d["MatchDate"]),
    matchType: num(d["MatchType"]),
    attitude: num(d["Attitude"]),
    tacticType: num(d["TacticType"]),
    coachModifier: num(chardata(d["CoachModifier"])),
    positions: asArray<R>(rec(lineup["Positions"])["Player"]).map(mapOrdersPlayer),
    bench: asArray<R>(rec(lineup["Bench"])["Player"]).map(mapOrdersPlayer),
    kickers: asArray<R>(rec(lineup["Kickers"])["Player"]).map(mapOrdersPlayer),
    setPieces: mapNamedPlayer(lineup["SetPieces"]),
    captain: mapNamedPlayer(lineup["Captain"]),
    playerOrders: asArray<R>(rec(d["PlayerOrders"])["PlayerOrder"]).map((o) => ({
      playerOrderId: num(o["PlayerOrderID"]),
      matchMinuteCriteria: num(o["MatchMinuteCriteria"]),
      goalDiffCriteria: num(o["GoalDiffCriteria"]),
      redCardCriteria: num(o["RedCardCriteria"]),
      subjectPlayerId: num(o["SubjectPlayerID"]),
      objectPlayerId: num(o["ObjectPlayerID"]),
      orderType: num(o["OrderType"]),
      newPositionId: num(o["NewPositionId"]),
      newPositionBehaviour: num(o["NewPositionBehaviour"]),
      playerOrderExtraInteger: num(o["PlayerOrderExtraInteger"]),
    })),
  };
}

// ===========================================================================
// teamdetails (3.9) — full Team (the minimal variant stays in client.ts)
// ===========================================================================
export const TEAMDETAILS_FULL_FILE = "teamdetails";
export const TEAMDETAILS_FULL_VERSION = "3.9";

export interface Team {
  id: number;
  name: string;
  shortName: string;
  isPrimaryClub: boolean;
  foundedDate: string;
  isDeactivated: boolean;
  gender: number;
  leagueSystemId: number;
  arenaId: number;
  arenaName: string;
  leagueId: number;
  leagueName: string;
  countryId: number;
  countryName: string;
  regionId: number;
  regionName: string;
  trainerId: number;
  homePage: string;
  cup: {
    stillInCup: boolean;
    id: number;
    name: string;
    matchRound: number;
    matchRoundsLeft: number;
  };
  powerRating: {
    globalRanking: number;
    leagueRanking: number;
    regionRanking: number;
    rating: number;
  };
  friendlyTeamId: number;
  seriesId: number;
  seriesName: string;
  leagueLevel: number;
  numberOfVictories: number;
  numberOfUndefeated: number;
  fanclubId: number;
  fanclubName: string;
  fanclubSize: number;
  logoUrl: string;
  teamColorsBackground: string;
  teamColorsText: string;
  dressUri: string;
  dressAlternateUri: string;
  isBot: boolean;
  teamRank: number;
  youthTeamId: number;
  youthTeamName: string;
  possibleToChallengeMidweek: boolean;
  possibleToChallengeWeekend: boolean;
}
export interface TeamUser {
  userId: number;
  loginName: string;
  name: string;
  languageId: number;
  languageName: string;
  supporterTier: number;
  signupDate: string;
  lastLoginDate: string;
  hasManagerLicense: boolean;
}
export interface TeamDetailsFull {
  user: TeamUser;
  teams: Team[];
}

function mapTeam(t: R): Team {
  const cup = rec(t["Cup"]);
  const pr = rec(t["PowerRating"]);
  const sr = rec(t["LeagueLevelUnit"]);
  const fc = rec(t["Fanclub"]);
  const col = rec(t["TeamColors"]);
  return {
    id: num(t["TeamID"]),
    name: str(t["TeamName"]),
    shortName: str(t["ShortTeamName"]),
    isPrimaryClub: bool(t["IsPrimaryClub"]),
    foundedDate: str(t["FoundedDate"]),
    isDeactivated: bool(t["IsDeactivated"]),
    gender: num(t["GenderID"]),
    leagueSystemId: num(t["LeagueSystemID"]),
    arenaId: num(rec(t["Arena"])["ArenaID"]),
    arenaName: str(rec(t["Arena"])["ArenaName"]),
    leagueId: num(rec(t["League"])["LeagueID"]),
    leagueName: str(rec(t["League"])["LeagueName"]),
    countryId: num(rec(t["Country"])["CountryID"]),
    countryName: str(rec(t["Country"])["CountryName"]),
    regionId: num(rec(t["Region"])["RegionID"]),
    regionName: str(rec(t["Region"])["RegionName"]),
    trainerId: num(rec(t["Trainer"])["PlayerID"]),
    homePage: str(t["HomePage"]),
    cup: {
      stillInCup: bool(cup["StillInCup"]),
      id: num(cup["CupID"]),
      name: str(cup["CupName"]),
      matchRound: num(cup["MatchRound"]),
      matchRoundsLeft: num(cup["MatchRoundsLeft"]),
    },
    powerRating: {
      globalRanking: num(pr["GlobalRanking"]),
      leagueRanking: num(pr["LeagueRanking"]),
      regionRanking: num(pr["RegionRanking"]),
      rating: num(pr["PowerRating"]),
    },
    friendlyTeamId: num(t["FriendlyTeamID"]),
    seriesId: num(sr["LeagueLevelUnitID"]),
    seriesName: str(sr["LeagueLevelUnitName"]),
    leagueLevel: num(sr["LeagueLevel"]),
    numberOfVictories: num(t["NumberOfVictories"]),
    numberOfUndefeated: num(t["NumberOfUndefeated"]),
    fanclubId: num(fc["FanclubID"]),
    fanclubName: str(fc["FanclubName"]),
    fanclubSize: num(fc["FanclubSize"]),
    logoUrl: str(t["LogoURL"]),
    teamColorsBackground: str(col["BackgroundColor"]),
    teamColorsText: str(col["Color"]),
    dressUri: str(t["DressURI"]),
    dressAlternateUri: str(t["DressAlternateURI"]),
    isBot: bool(rec(t["BotStatus"])["IsBot"]),
    teamRank: num(t["TeamRank"]),
    youthTeamId: num(t["YouthTeamID"]),
    youthTeamName: str(t["YouthTeamName"]),
    possibleToChallengeMidweek: bool(t["PossibleToChallengeMidweek"]),
    possibleToChallengeWeekend: bool(t["PossibleToChallengeWeekend"]),
  };
}

export function mapTeamDetailsFull(root: HattrickData): TeamDetailsFull {
  const u = rec(root["User"]);
  return {
    user: {
      userId: num(u["UserID"]),
      loginName: str(u["Loginname"]),
      name: str(u["Name"]),
      languageId: num(rec(u["Language"])["LanguageID"]),
      languageName: str(rec(u["Language"])["LanguageName"]),
      supporterTier: num(u["SupporterTier"]),
      signupDate: str(u["SignupDate"]),
      lastLoginDate: str(u["LastLoginDate"]),
      hasManagerLicense: bool(u["HasManagerLicense"]),
    },
    teams: asArray<R>(rec(root["Teams"])["Team"]).map(mapTeam),
  };
}
