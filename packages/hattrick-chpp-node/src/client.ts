import type { OAuthCredentials } from "./oauth.js";
import { Transport, type FetchLike } from "./transport.js";
import { asArray, bool, decodeXml, num, str, type HattrickData } from "./xml.js";
import type {
  Avatar,
  AvatarKind,
  Economy,
  Ladder,
  LadderDetails,
  Match,
  Player,
  PlayerAvatars,
  TeamDetails,
  TeamMatches,
  TeamPlayers,
  Training,
  TransferListing,
  TransferSearchQuery,
  TransferSearchResults,
} from "./models.js";

export const AVATARS_FILE = "avatars";
export const AVATARS_VERSION = "1.1";
export const PLAYERS_FILE = "players";
export const PLAYERS_VERSION = "2.8";
export const TEAMDETAILS_FILE = "teamdetails";
export const TEAMDETAILS_VERSION = "3.9";
export const ECONOMY_FILE = "economy";
export const ECONOMY_VERSION = "1.4";
export const TRAINING_FILE = "training";
export const TRAINING_VERSION = "2.2";
export const MATCHES_FILE = "matches";
export const MATCHES_VERSION = "2.9";
export const LADDERLIST_FILE = "ladderlist";
export const LADDERLIST_VERSION = "1.0";
export const LADDERDETAILS_FILE = "ladderdetails";
export const LADDERDETAILS_VERSION = "1.0";
export const TRANSFERSEARCH_FILE = "transfersearch";
export const TRANSFERSEARCH_VERSION = "1.1";

/**
 * A typed client for the Hattrick CHPP API. One method per operation,
 * returning already-decoded types. Ported from lucianoq/hattrick.
 *
 * Endpoint coverage is being expanded wave by wave; avatars and players
 * land first because the renderer and team-photo apps depend on them.
 */
export class HattrickClient {
  private readonly transport: Transport;

  constructor(creds: OAuthCredentials, fetchImpl?: FetchLike) {
    this.transport = new Transport(creds, fetchImpl);
  }

  private async get(
    file: string,
    version: string,
    values: Record<string, string> = {},
  ): Promise<HattrickData> {
    const xml = await this.transport.getRawXml(file, version, values);
    return decodeXml(xml, file);
  }

  // --- avatars ---

  /** Avatars for the requesting user's own team (players or hall of fame). */
  async getMyAvatars(kind: AvatarKind = "players"): Promise<PlayerAvatars[]> {
    return mapAvatars(await this.get(AVATARS_FILE, AVATARS_VERSION, { actionType: kind }));
  }

  /** Avatars for the given team (players or hall of fame). */
  async getAvatars(teamId: number, kind: AvatarKind = "players"): Promise<PlayerAvatars[]> {
    return mapAvatars(
      await this.get(AVATARS_FILE, AVATARS_VERSION, { actionType: kind, teamId: String(teamId) }),
    );
  }

  // --- players ---

  /** The requesting user's own squad. */
  async getMyPlayers(): Promise<TeamPlayers> {
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, {}));
  }

  /** A given team's squad. */
  async getPlayers(teamId: number): Promise<TeamPlayers> {
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, { teamId: String(teamId) }));
  }

  // --- teamdetails ---

  /** Details for the requesting user's own team(s). */
  async getMyTeamDetails(): Promise<TeamDetails> {
    return mapTeamDetails(await this.get(TEAMDETAILS_FILE, TEAMDETAILS_VERSION, {}));
  }

  /** Details for the given team. */
  async getTeamDetails(teamId: number): Promise<TeamDetails> {
    return mapTeamDetails(
      await this.get(TEAMDETAILS_FILE, TEAMDETAILS_VERSION, { teamId: String(teamId) }),
    );
  }

  // --- economy ---

  /** Finances for the requesting user's primary team. */
  async getMyEconomy(): Promise<Economy> {
    return mapEconomy(await this.get(ECONOMY_FILE, ECONOMY_VERSION, {}));
  }

  /** Finances for the given team. */
  async getEconomy(teamId: number): Promise<Economy> {
    return mapEconomy(await this.get(ECONOMY_FILE, ECONOMY_VERSION, { teamId: String(teamId) }));
  }

  // --- training ---

  /** Training settings for the requesting user's own team. */
  async getMyTraining(): Promise<Training> {
    return mapTraining(await this.get(TRAINING_FILE, TRAINING_VERSION, {}));
  }

  /** Training settings for the given team. */
  async getTraining(teamId: number): Promise<Training> {
    return mapTraining(await this.get(TRAINING_FILE, TRAINING_VERSION, { teamId: String(teamId) }));
  }

  // --- matches ---

  /** Recent and upcoming matches for the requesting user's own team. */
  async getMyMatches(): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, {}));
  }

  /** Recent and upcoming matches for the given team. */
  async getMatches(teamId: number): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, { teamId: String(teamId) }));
  }

  // --- ladders ---

  /** Ladders the requesting user's own team takes part in. */
  async getMyLadders(): Promise<Ladder[]> {
    return mapLadders(await this.get(LADDERLIST_FILE, LADDERLIST_VERSION, {}));
  }

  /** Ladders the given team takes part in. */
  async getLadders(teamId: number): Promise<Ladder[]> {
    return mapLadders(
      await this.get(LADDERLIST_FILE, LADDERLIST_VERSION, { teamId: String(teamId) }),
    );
  }

  /** A ladder's ranking table (optionally a given page, or around a team). */
  async getLadderDetails(
    ladderId: number,
    opts: { teamId?: number; pageIndex?: number; pageSize?: number } = {},
  ): Promise<LadderDetails> {
    const values: Record<string, string> = { ladderId: String(ladderId) };
    if (opts.teamId) values.teamId = String(opts.teamId);
    if (opts.pageIndex !== undefined) values.pageIndex = String(opts.pageIndex);
    if (opts.pageSize !== undefined) values.pageSize = String(opts.pageSize);
    return mapLadderDetails(await this.get(LADDERDETAILS_FILE, LADDERDETAILS_VERSION, values));
  }

  // --- transfer search ---

  /** Searches the transfer market by age range and a primary skill filter. */
  async searchTransfers(q: TransferSearchQuery): Promise<TransferSearchResults> {
    const values: Record<string, string> = {
      ageMin: String(q.ageMin),
      ageMax: String(q.ageMax),
      skillType1: String(q.skillId),
      minSkillValue1: String(q.skillMin),
      maxSkillValue1: String(q.skillMax),
      pageIndex: String(q.pageIndex ?? 0),
    };
    if (q.priceMaxSek !== undefined) values.priceMax = String(q.priceMaxSek);
    return mapTransferSearch(await this.get(TRANSFERSEARCH_FILE, TRANSFERSEARCH_VERSION, values));
  }
}

// --- mappers (XML object -> typed model) ---

function rec(v: unknown): Record<string, unknown> {
  return (v ?? {}) as Record<string, unknown>;
}

/** Normalizes CHPP match status (numeric or word form) to 0/1/2. */
function matchStatus(v: unknown): number {
  const s = str(v).toUpperCase();
  if (s === "1" || s === "ONGOING") return 1;
  if (s === "2" || s === "FINISHED") return 2;
  return 0; // 0 / UPCOMING / absent
}

export function mapAvatars(root: HattrickData): PlayerAvatars[] {
  const players = rec(rec(root["Team"])["Players"]);
  return asArray<Record<string, unknown>>(players["Player"]).map((p) => ({
    playerId: num(p["PlayerID"]),
    avatar: mapAvatar(rec(p["Avatar"])),
  }));
}

function mapAvatar(a: Record<string, unknown>): Avatar {
  return {
    backgroundImage: str(a["BackgroundImage"]),
    layers: asArray<Record<string, unknown>>(a["Layer"]).map((l) => ({
      image: str(l["Image"]),
      x: num(l["@_x"]),
      y: num(l["@_y"]),
    })),
  };
}

export function mapPlayers(root: HattrickData): TeamPlayers {
  const team = rec(root["Team"]);
  const list = rec(team["PlayerList"]);
  return {
    teamId: num(team["TeamID"]),
    teamName: str(team["TeamName"]),
    players: asArray<Record<string, unknown>>(list["Player"]).map(mapPlayer),
  };
}

function mapPlayer(p: Record<string, unknown>): Player {
  return {
    id: num(p["PlayerID"]),
    firstName: str(p["FirstName"]),
    nickName: str(p["NickName"]),
    lastName: str(p["LastName"]),
    number: num(p["PlayerNumber"]),
    age: num(p["Age"]),
    ageDays: num(p["AgeDays"]),
    tsi: num(p["TSI"]),
    form: num(p["PlayerForm"]),
    experience: num(p["Experience"]),
    loyalty: num(p["Loyalty"]),
    motherClubBonus: bool(p["MotherClubBonus"]),
    leadership: num(p["Leadership"]),
    salarySek: num(p["Salary"]),
    isAbroad: bool(p["IsAbroad"]),
    specialtyId: num(p["Specialty"]),
    transferListed: bool(p["TransferListed"]),
    countryId: num(p["CountryID"]),
    cards: num(p["Cards"]),
    injuryLevel: num(p["InjuryLevel"]),
    staminaSkill: num(p["StaminaSkill"]),
    keeperSkill: num(p["KeeperSkill"]),
    playmakerSkill: num(p["PlaymakerSkill"]),
    scorerSkill: num(p["ScorerSkill"]),
    passingSkill: num(p["PassingSkill"]),
    wingerSkill: num(p["WingerSkill"]),
    defenderSkill: num(p["DefenderSkill"]),
    setPiecesSkill: num(p["SetPiecesSkill"]),
    categoryId: num(p["PlayerCategoryId"]),
  };
}

export function mapTeamDetails(root: HattrickData): TeamDetails {
  const user = rec(root["User"]);
  const teams = rec(root["Teams"]);
  return {
    userId: num(user["UserID"]),
    loginName: str(user["Loginname"]),
    teams: asArray<Record<string, unknown>>(teams["Team"]).map((t) => ({
      id: num(t["TeamID"]),
      name: str(t["TeamName"]),
      shortName: str(t["ShortTeamName"]),
      isPrimaryClub: bool(t["IsPrimaryClub"]),
    })),
  };
}

export function mapEconomy(root: HattrickData): Economy {
  const t = rec(root["Team"]);
  return {
    teamId: num(t["TeamID"]),
    teamName: str(t["TeamName"]),
    cashSek: num(t["Cash"]),
    expectedCashSek: num(t["ExpectedCash"]),
    incomeSumSek: num(t["IncomeSum"]),
    costsSumSek: num(t["CostsSum"]),
    costsPlayerSek: num(t["CostsPlayer"]),
    costsStaffSek: num(t["CostsStaff"]),
    costsArenaSek: num(t["CostsArena"]),
    costsYouthSek: num(t["CostsYouth"]),
    expectedWeeksTotalSek: num(t["ExpectedWeeksTotal"]),
    lastIncomeSumSek: num(t["LastIncomeSum"]),
    lastCostsSumSek: num(t["LastCostsSum"]),
    lastWeeksTotalSek: num(t["LastWeeksTotal"]),
  };
}

export function mapTraining(root: HattrickData): Training {
  const t = rec(root["Team"]);
  const special = rec(t["SpecialTraining"]);
  return {
    teamId: num(t["TeamID"]),
    teamName: str(t["TeamName"]),
    trainingLevel: num(t["TrainingLevel"]),
    staminaTrainingPart: num(t["StaminaTrainingPart"]),
    trainingTypeId: num(t["TrainingType"]),
    trainerId: num(rec(t["Trainer"])["TrainerID"]),
    trainerName: str(rec(t["Trainer"])["TrainerName"]),
    specialTrainingPlayerIds: asArray<Record<string, unknown>>(special["Player"]).map((p) =>
      num(p["PlayerID"]),
    ),
  };
}

export function mapMatches(root: HattrickData): TeamMatches {
  const team = rec(root["Team"]);
  const list = rec(team["MatchList"]);
  return {
    teamId: num(team["TeamID"]),
    teamName: str(team["TeamName"]),
    matches: asArray<Record<string, unknown>>(list["Match"]).map(mapMatch),
  };
}

function mapMatch(m: Record<string, unknown>): Match {
  const home = rec(m["HomeTeam"]);
  const away = rec(m["AwayTeam"]);
  return {
    matchId: num(m["MatchID"]),
    homeTeamId: num(home["HomeTeamID"]),
    homeTeamName: str(home["HomeTeamName"]),
    awayTeamId: num(away["AwayTeamID"]),
    awayTeamName: str(away["AwayTeamName"]),
    matchDate: str(m["MatchDate"]),
    sourceSystem: str(m["SourceSystem"]),
    matchType: num(m["MatchType"]),
    matchContextId: num(m["MatchContextId"]),
    homeGoals: num(m["HomeGoals"]),
    awayGoals: num(m["AwayGoals"]),
    status: matchStatus(m["Status"]),
    ordersGiven: bool(m["OrdersGiven"]),
  };
}

export function mapLadders(root: HattrickData): Ladder[] {
  const ladders = rec(root["Ladders"]);
  return asArray<Record<string, unknown>>(ladders["Ladder"]).map((l) => ({
    id: num(l["LadderId"]),
    name: str(l["Name"]),
    position: num(l["Posistion"]), // CHPP's own spelling
    nextMatchDate: str(l["NextMatchDate"]),
    wins: num(l["Wins"]),
    lost: num(l["Lost"]),
  }));
}

export function mapLadderDetails(root: HattrickData): LadderDetails {
  const l = rec(root["Ladder"]);
  return {
    id: num(l["LadderId"]),
    name: str(l["Name"]),
    numOfTeams: num(l["NumOfTeams"]),
    pageSize: num(l["PageSize"]),
    pageIndex: num(l["PageIndex"]),
    kingTeamId: num(l["KingTeamId"]),
    kingTeamName: str(l["KingTeamName"]),
    teams: asArray<Record<string, unknown>>(l["Team"]).map((t) => ({
      id: num(t["TeamId"]),
      name: str(t["TeamName"]),
      position: num(t["Position"]),
      wins: num(t["Wins"]),
      lost: num(t["Lost"]),
      winsInARow: num(t["WinsInARow"]),
      lostInARow: num(t["LostInARow"]),
    })),
  };
}

export function mapTransferSearch(root: HattrickData): TransferSearchResults {
  const ts = rec(root["TransferSearch"]);
  const results = rec(ts["TransferResults"]);
  return {
    itemCount: num(ts["ItemCount"]),
    pageSize: num(ts["PageSize"]),
    pageIndex: num(ts["PageIndex"]),
    results: asArray<Record<string, unknown>>(results["TransferResult"]).map(mapTransferListing),
  };
}

function mapTransferListing(r: Record<string, unknown>): TransferListing {
  const d = rec(r["Details"]);
  return {
    playerId: num(r["PlayerId"]),
    firstName: str(r["FirstName"]),
    nickName: str(r["NickName"]),
    lastName: str(r["LastName"]),
    askingPriceSek: num(r["AskingPrice"]),
    deadline: str(r["Deadline"]),
    highestBidSek: num(r["HighestBid"]),
    age: num(d["Age"]),
    ageDays: num(d["AgeDays"]),
    salarySek: num(d["Salary"]),
    tsi: num(d["TSI"]),
    form: num(d["PlayerForm"]),
    experience: num(d["Experience"]),
    specialtyId: num(d["Specialty"]),
    keeperSkill: num(d["KeeperSkill"]),
    playmakerSkill: num(d["PlaymakerSkill"]),
    scorerSkill: num(d["ScorerSkill"]),
    passingSkill: num(d["PassingSkill"]),
    wingerSkill: num(d["WingerSkill"]),
    defenderSkill: num(d["DefenderSkill"]),
    setPiecesSkill: num(d["SetPiecesSkill"]),
    staminaSkill: num(d["StaminaSkill"]),
  };
}

export type { OAuthCredentials };
