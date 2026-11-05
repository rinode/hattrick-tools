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
import {
  ARENADETAILS_FILE,
  ARENADETAILS_VERSION,
  CLUB_FILE,
  CLUB_VERSION,
  FANS_FILE,
  FANS_VERSION,
  STAFFLIST_FILE,
  STAFFLIST_VERSION,
  mapArena,
  mapClub,
  mapFans,
  mapLeagueArenaStats,
  mapMyArenaStats,
  mapStaffList,
  type Arena,
  type Club,
  type Fans,
  type LeagueArenaStats,
  type MyArenaStats,
  type StaffList,
} from "./endpoints.js";
import {
  CURRENTBIDS_FILE,
  CURRENTBIDS_VERSION,
  HOFPLAYERS_FILE,
  HOFPLAYERS_VERSION,
  PLAYERDETAILS_FILE,
  PLAYERDETAILS_VERSION,
  PLAYEREVENTS_FILE,
  PLAYEREVENTS_VERSION,
  TRANSFERSPLAYER_FILE,
  TRANSFERSPLAYER_VERSION,
  TRANSFERSTEAM_FILE,
  TRANSFERSTEAM_VERSION,
  mapCurrentBids,
  mapHofPlayers,
  mapPlayerDetails,
  mapPlayerEvents,
  mapPlayerTransferHistory,
  mapTeamTransfers,
  type Bid,
  type HofPlayer,
  type PlayerDetails,
  type PlayerEvent,
  type PlayerTransferHistory,
  type TeamTransfers,
} from "./endpoints.js";
import {
  CUPMATCHES_FILE,
  CUPMATCHES_VERSION,
  MATCHDETAILS_FILE,
  MATCHDETAILS_VERSION,
  MATCHESARCHIVE_FILE,
  MATCHESARCHIVE_VERSION,
  MATCHLINEUP_FILE,
  MATCHLINEUP_VERSION,
  mapCupMatches,
  mapMatchDetails,
  mapMatchLineup,
  type CupMatches,
  type MatchDetails,
  type MatchLineup,
} from "./endpoints.js";
import {
  ACHIEVEMENTS_FILE,
  ACHIEVEMENTS_VERSION,
  BOOKMARKS_FILE,
  BOOKMARKS_VERSION,
  LEAGUELEVELS_FILE,
  LEAGUELEVELS_VERSION,
  REGIONDETAILS_FILE,
  REGIONDETAILS_VERSION,
  SEARCH_FILE,
  SEARCH_VERSION,
  STAFFAVATARS_FILE,
  STAFFAVATARS_VERSION,
  SUPPORTERS_FILE,
  SUPPORTERS_VERSION,
  TRANSLATIONS_FILE,
  TRANSLATIONS_VERSION,
  WORLDLANGUAGES_FILE,
  WORLDLANGUAGES_VERSION,
  YOUTHAVATARS_FILE,
  YOUTHAVATARS_VERSION,
  mapAchievements,
  mapBookmarks,
  mapLeagueLevels,
  mapMySupporters,
  mapRegionDetails,
  mapSearch,
  mapStaffAvatars,
  mapSupportedTeams,
  mapTranslations,
  mapWorldLanguages,
  mapYouthAvatars,
  type Achievement,
  type Bookmark,
  type LeagueLevel,
  type RegionDetails,
  type SearchResult,
  type StaffAvatars,
  type SupporterTeam,
  type Translations,
  type WorldLanguage,
  type YouthPlayerAvatar,
} from "./endpoints.js";
import {
  LEAGUEDETAILS_FILE,
  LEAGUEDETAILS_VERSION,
  LEAGUEFIXTURES_FILE,
  LEAGUEFIXTURES_VERSION,
  MANAGERCOMPENDIUM_FILE,
  MANAGERCOMPENDIUM_VERSION,
  WORLDDETAILS_FILE,
  WORLDDETAILS_VERSION,
  mapManager,
  mapSeries,
  mapSeriesFixtures,
  mapWorldDetails,
  type League,
  type Manager,
  type Series,
  type SeriesFixtures,
} from "./endpoints.js";
import {
  YOUTHLEAGUEDETAILS_FILE,
  YOUTHLEAGUEDETAILS_VERSION,
  YOUTHLEAGUEFIXTURES_FILE,
  YOUTHLEAGUEFIXTURES_VERSION,
  YOUTHPLAYERDETAILS_FILE,
  YOUTHPLAYERDETAILS_VERSION,
  YOUTHPLAYERLIST_FILE,
  YOUTHPLAYERLIST_VERSION,
  YOUTHTEAMDETAILS_FILE,
  YOUTHTEAMDETAILS_VERSION,
  mapYouthLeagueDetails,
  mapYouthLeagueFixtures,
  mapYouthPlayerDetails,
  mapYouthPlayerList,
  mapYouthTeamDetails,
  type YouthLeagueDetails,
  type YouthLeagueFixtures,
  type YouthPlayer,
  type YouthTeamDetails,
} from "./endpoints.js";
import {
  ALLIANCEDETAILS_FILE,
  ALLIANCEDETAILS_VERSION,
  ALLIANCES_FILE,
  ALLIANCES_VERSION,
  LIVE_FILE,
  LIVE_VERSION,
  NATIONALPLAYERS_FILE,
  NATIONALPLAYERS_VERSION,
  NATIONALTEAMDETAILS_FILE,
  NATIONALTEAMDETAILS_VERSION,
  NATIONALTEAMMATCHES_FILE,
  NATIONALTEAMMATCHES_VERSION,
  NATIONALTEAMS_FILE,
  NATIONALTEAMS_VERSION,
  TOURNAMENTDETAILS_FILE,
  TOURNAMENTDETAILS_VERSION,
  TOURNAMENTFIXTURES_FILE,
  TOURNAMENTFIXTURES_VERSION,
  TOURNAMENTLEAGUETABLES_FILE,
  TOURNAMENTLEAGUETABLES_VERSION,
  TOURNAMENTLIST_FILE,
  TOURNAMENTLIST_VERSION,
  WORLDCUP_FILE,
  WORLDCUP_VERSION,
  mapAllianceDetails,
  mapAlliances,
  mapLiveMatches,
  mapNationalPlayers,
  mapNationalPlayersStats,
  mapNationalTeamDetails,
  mapNationalTeamMatches,
  mapNationalTeams,
  mapTournamentDetails,
  mapTournamentFixtures,
  mapTournamentLeagueTables,
  mapTournamentList,
  mapWorldCupMatches,
  mapWorldCupScores,
  type Alliance,
  type LiveMatch,
  type NationalPlayersStats,
  type NationalTeamDetails,
  type NationalTeamMatch,
  type NationalTeamPlayer,
  type NationalTeamsList,
  type Tournament,
  type TournamentFixture,
  type TournamentLeagueTable,
  type WorldCupMatch,
  type WorldCupScore,
} from "./endpoints.js";
import {
  CHALLENGES_FILE,
  CHALLENGES_VERSION,
  MATCHORDERS_FILE,
  MATCHORDERS_VERSION,
  TRAININGEVENTS_FILE,
  TRAININGEVENTS_VERSION,
  mapChallengeable,
  mapChallenges,
  mapMatchOrders,
  mapTrainingEvents,
  type ChallengeableResult,
  type Challenges,
  type MatchOrders,
  type TrainingEvent,
} from "./endpoints.js";
import {
  TEAMDETAILS_FULL_FILE,
  TEAMDETAILS_FULL_VERSION,
  mapTeamDetailsFull,
  type Team,
  type TeamDetailsFull,
} from "./endpoints.js";

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
// 1.2 (2026-09-22): priceMin/priceMax are read in SEK, like every other money
// value in CHPP. In 1.1 they were read in the manager's own currency, so the
// priceMax (SEK) sent below is only interpreted correctly from 1.2 onward.
export const TRANSFERSEARCH_VERSION = "1.2";

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

  private async post(
    file: string,
    version: string,
    values: Record<string, string>,
    lineup: string,
  ): Promise<HattrickData> {
    const xml = await this.transport.postRawXml(file, version, values, lineup);
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

  /** The requesting user's own squad (optionally sorted, e.g. "age", "salary"). */
  async getMyPlayers(orderBy?: string): Promise<TeamPlayers> {
    const v: Record<string, string> = { actionType: "view" };
    if (orderBy) v.orderBy = orderBy;
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, v));
  }

  /** A given team's squad (optionally sorted). */
  async getPlayers(teamId: number, orderBy?: string): Promise<TeamPlayers> {
    const v: Record<string, string> = { actionType: "view", teamId: String(teamId) };
    if (orderBy) v.orderBy = orderBy;
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, v));
  }

  /** The user's own former players. */
  async getMyOldPlayers(): Promise<TeamPlayers> {
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, { actionType: "viewOldies" }));
  }

  /** A given team's former players. */
  async getOldPlayers(teamId: number): Promise<TeamPlayers> {
    return mapPlayers(
      await this.get(PLAYERS_FILE, PLAYERS_VERSION, { actionType: "viewOldies", teamId: String(teamId) }),
    );
  }

  /** The user's own former trainers. */
  async getMyOldCoaches(): Promise<TeamPlayers> {
    return mapPlayers(await this.get(PLAYERS_FILE, PLAYERS_VERSION, { actionType: "viewOldCoaches" }));
  }

  /** A given team's former trainers. */
  async getOldCoaches(teamId: number): Promise<TeamPlayers> {
    return mapPlayers(
      await this.get(PLAYERS_FILE, PLAYERS_VERSION, { actionType: "viewOldCoaches", teamId: String(teamId) }),
    );
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

  /** Recent and upcoming senior matches for the user's own team. */
  async getMyMatches(opts: { until?: string } = {}): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, matchParams(false, undefined, opts.until)));
  }

  /** Recent and upcoming senior matches for the given team. */
  async getMatches(teamId: number, opts: { until?: string } = {}): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, matchParams(false, teamId, opts.until)));
  }

  /** Recent and upcoming youth matches for the user's own youth team. */
  async getMyYouthMatches(opts: { until?: string } = {}): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, matchParams(true, undefined, opts.until)));
  }

  /** Recent and upcoming youth matches for the given youth team. */
  async getYouthMatches(teamId: number, opts: { until?: string } = {}): Promise<TeamMatches> {
    return mapMatches(await this.get(MATCHES_FILE, MATCHES_VERSION, matchParams(true, teamId, opts.until)));
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
    if (q.priceMinSek !== undefined) values.priceMin = String(q.priceMinSek);
    if (q.priceMaxSek !== undefined) values.priceMax = String(q.priceMaxSek);
    return mapTransferSearch(await this.get(TRANSFERSEARCH_FILE, TRANSFERSEARCH_VERSION, values));
  }

  // --- club ---

  /** Staff specialist levels and youth-squad status for the user's own team. */
  async getMyClub(): Promise<Club> {
    return mapClub(await this.get(CLUB_FILE, CLUB_VERSION, {}));
  }

  /** Staff specialist levels and youth-squad status for the given team. */
  async getClub(teamId: number): Promise<Club> {
    return mapClub(await this.get(CLUB_FILE, CLUB_VERSION, { teamId: String(teamId) }));
  }

  // --- arena ---

  /** The requesting user's own arena. */
  async getMyArena(): Promise<Arena> {
    return mapArena(await this.get(ARENADETAILS_FILE, ARENADETAILS_VERSION, { StatsType: "" }));
  }

  /** A given arena by id. */
  async getArena(arenaId: number): Promise<Arena> {
    return mapArena(
      await this.get(ARENADETAILS_FILE, ARENADETAILS_VERSION, {
        StatsType: "",
        arenaID: String(arenaId),
      }),
    );
  }

  /** A given team's arena. */
  async getArenaByTeam(teamId: number): Promise<Arena> {
    return mapArena(
      await this.get(ARENADETAILS_FILE, ARENADETAILS_VERSION, {
        StatsType: "",
        teamId: String(teamId),
      }),
    );
  }

  /** Biggest-arena supporter stats for a league (0 = global). */
  async getArenaStats(leagueId = 0): Promise<LeagueArenaStats> {
    return mapLeagueArenaStats(
      await this.get(ARENADETAILS_FILE, ARENADETAILS_VERSION, {
        StatsType: "OtherArenas",
        StatsLeagueID: String(leagueId),
      }),
    );
  }

  /** Supporter statistics for the user's own arena, over its full history. */
  async getMyArenaSupporterStats(): Promise<MyArenaStats> {
    return mapMyArenaStats(
      await this.get(ARENADETAILS_FILE, ARENADETAILS_VERSION, { StatsType: "MyArena" }),
    );
  }

  // --- fans ---

  /** Fan club, mood and recent/upcoming matches for the user's own team. */
  async getMyFans(): Promise<Fans> {
    return mapFans(await this.get(FANS_FILE, FANS_VERSION, {}));
  }

  /** Fan data for the given team (must be managed by the requesting user). */
  async getFans(teamId: number): Promise<Fans> {
    return mapFans(await this.get(FANS_FILE, FANS_VERSION, { teamId: String(teamId) }));
  }

  // --- staff ---

  /** Trainer and staff members for the user's own primary team. */
  async getMyStaff(): Promise<StaffList> {
    return mapStaffList(await this.get(STAFFLIST_FILE, STAFFLIST_VERSION, {}));
  }

  /** Trainer and staff members for the given team. */
  async getStaff(teamId: number): Promise<StaffList> {
    return mapStaffList(await this.get(STAFFLIST_FILE, STAFFLIST_VERSION, { teamId: String(teamId) }));
  }

  // --- player details ---

  /** Full detailed information for a single player. */
  async getPlayerDetails(playerId: number, includeMatchInfo = true): Promise<PlayerDetails> {
    return mapPlayerDetails(
      await this.get(PLAYERDETAILS_FILE, PLAYERDETAILS_VERSION, {
        actionType: "view",
        playerID: String(playerId),
        includeMatchInfo: String(includeMatchInfo),
      }),
    );
  }

  /** The log of notable events for a single player. */
  async getPlayerEvents(playerId: number): Promise<PlayerEvent[]> {
    return mapPlayerEvents(
      await this.get(PLAYEREVENTS_FILE, PLAYEREVENTS_VERSION, { playerID: String(playerId) }),
    );
  }

  /** A single player's transfer history. */
  async getPlayerTransferHistory(playerId: number): Promise<PlayerTransferHistory> {
    return mapPlayerTransferHistory(
      await this.get(TRANSFERSPLAYER_FILE, TRANSFERSPLAYER_VERSION, { playerID: String(playerId) }),
    );
  }

  // --- team transfers ---

  /** The user's own team transfer history + stats (pageIndex 0 = last page). */
  async getMyTransfersTeam(pageIndex = 0): Promise<TeamTransfers> {
    return mapTeamTransfers(
      await this.get(TRANSFERSTEAM_FILE, TRANSFERSTEAM_VERSION, { pageIndex: String(pageIndex) }),
    );
  }

  /** A given team's transfer history + stats (pageIndex 0 = last page). */
  async getTransfersTeam(teamId: number, pageIndex = 0): Promise<TeamTransfers> {
    return mapTeamTransfers(
      await this.get(TRANSFERSTEAM_FILE, TRANSFERSTEAM_VERSION, {
        teamID: String(teamId),
        pageIndex: String(pageIndex),
      }),
    );
  }

  // --- hall of fame ---

  /** Hall of Fame players for the user's own team. */
  async getMyHofPlayers(): Promise<HofPlayer[]> {
    return mapHofPlayers(await this.get(HOFPLAYERS_FILE, HOFPLAYERS_VERSION, {}));
  }

  /** Hall of Fame players for the given team. */
  async getHofPlayers(teamId: number): Promise<HofPlayer[]> {
    return mapHofPlayers(await this.get(HOFPLAYERS_FILE, HOFPLAYERS_VERSION, { teamID: String(teamId) }));
  }

  // --- current bids ---

  /** Active, recently finished and hotlisted transfers tracked for the team. */
  async getCurrentBids(): Promise<Bid[]> {
    return mapCurrentBids(await this.get(CURRENTBIDS_FILE, CURRENTBIDS_VERSION, { actionType: "view" }));
  }

  // --- match details ---

  /** Default match details (Hattrick main system, no play-by-play events). */
  async getMatch(matchId: number): Promise<MatchDetails> {
    return this.getMatchDetails(matchId);
  }

  /** Match details for a given match, source system and optional events. */
  async getMatchDetails(
    matchId: number,
    opts: { sourceSystem?: string; matchEvents?: boolean } = {},
  ): Promise<MatchDetails> {
    return mapMatchDetails(
      await this.get(MATCHDETAILS_FILE, MATCHDETAILS_VERSION, {
        matchID: String(matchId),
        sourceSystem: opts.sourceSystem ?? "hattrick",
        matchEvents: String(opts.matchEvents ?? false),
      }),
    );
  }

  // --- match lineup ---

  /** A team's lineup, substitutions and end-of-match ratings for a match. */
  async getMatchLineup(
    matchId: number,
    opts: { teamId?: number; sourceSystem?: string } = {},
  ): Promise<MatchLineup> {
    const values: Record<string, string> = {
      matchID: String(matchId),
      sourceSystem: opts.sourceSystem ?? "hattrick",
    };
    if (opts.teamId) values.teamID = String(opts.teamId);
    return mapMatchLineup(await this.get(MATCHLINEUP_FILE, MATCHLINEUP_VERSION, values));
  }

  // --- cup matches ---

  /** All matches for a cup (latest season/round if omitted); paginated. */
  async getCupMatches(
    cupId: number,
    opts: { season?: number; round?: number } = {},
  ): Promise<CupMatches> {
    const values: Record<string, string> = { CupID: String(cupId) };
    if (opts.season !== undefined) values.Season = String(opts.season);
    if (opts.round !== undefined) values.CupRound = String(opts.round);
    const first = mapCupMatches(await this.get(CUPMATCHES_FILE, CUPMATCHES_VERSION, values));
    const all = [...first.matches];
    let page = first.matches;
    const PAGE = 256;
    while (page.length >= PAGE) {
      values.StartAfterMatchID = String(page[PAGE - 1]!.matchId);
      page = mapCupMatches(await this.get(CUPMATCHES_FILE, CUPMATCHES_VERSION, values)).matches;
      all.push(...page);
    }
    return { ...first, matches: all };
  }

  // --- matches archive ---

  /** Archived matches for a team in a date range or season (max 50). */
  async getMatchesArchive(
    opts: {
      teamId?: number;
      firstMatchDate?: string;
      lastMatchDate?: string;
      season?: number;
      isYouth?: boolean;
      includeHTO?: boolean;
    } = {},
  ): Promise<Match[]> {
    const values: Record<string, string> = {};
    if (opts.teamId) values.teamID = String(opts.teamId);
    if (opts.isYouth) values.isYouth = "true";
    if (opts.includeHTO) values.includeHTO = "true";
    if (opts.season !== undefined) values.season = String(opts.season);
    if (opts.firstMatchDate) values.FirstMatchDate = opts.firstMatchDate;
    if (opts.lastMatchDate) values.LastMatchDate = opts.lastMatchDate;
    return mapMatches(await this.get(MATCHESARCHIVE_FILE, MATCHESARCHIVE_VERSION, values)).matches;
  }

  // --- league levels ---

  /** League-level structure for the user's own league. */
  async getMyLeagueLevels(): Promise<LeagueLevel[]> {
    return mapLeagueLevels(await this.get(LEAGUELEVELS_FILE, LEAGUELEVELS_VERSION, {}));
  }

  /** League-level structure for the given league. */
  async getLeagueLevels(leagueId: number): Promise<LeagueLevel[]> {
    return mapLeagueLevels(
      await this.get(LEAGUELEVELS_FILE, LEAGUELEVELS_VERSION, { LeagueID: String(leagueId) }),
    );
  }

  // --- region details ---

  /** The user's own region (users online, weather). */
  async getMyRegion(): Promise<RegionDetails> {
    return mapRegionDetails(await this.get(REGIONDETAILS_FILE, REGIONDETAILS_VERSION, {}));
  }

  /** A given region's details. */
  async getRegion(regionId: number): Promise<RegionDetails> {
    return mapRegionDetails(
      await this.get(REGIONDETAILS_FILE, REGIONDETAILS_VERSION, { regionID: String(regionId) }),
    );
  }

  // --- supporters ---

  /** Teams the user supports. */
  async getMySupportedTeams(pageIndex = 0, pageSize?: number): Promise<SupporterTeam[]> {
    const v: Record<string, string> = { actionType: "supportedteams", pageIndex: String(pageIndex) };
    if (pageSize) v.pageSize = String(pageSize);
    return mapSupportedTeams(await this.get(SUPPORTERS_FILE, SUPPORTERS_VERSION, v));
  }

  /** Teams a given user supports. */
  async getSupportedTeams(userId: number, pageIndex = 0, pageSize?: number): Promise<SupporterTeam[]> {
    const v: Record<string, string> = {
      actionType: "supportedteams",
      pageIndex: String(pageIndex),
      userId: String(userId),
    };
    if (pageSize) v.pageSize = String(pageSize);
    return mapSupportedTeams(await this.get(SUPPORTERS_FILE, SUPPORTERS_VERSION, v));
  }

  /** The user's own supporters. */
  async getMySupporters(pageIndex = 0, pageSize?: number): Promise<SupporterTeam[]> {
    const v: Record<string, string> = { actionType: "mysupporters", pageIndex: String(pageIndex) };
    if (pageSize) v.pageSize = String(pageSize);
    return mapMySupporters(await this.get(SUPPORTERS_FILE, SUPPORTERS_VERSION, v));
  }

  /** A given team's supporters. */
  async getSupporters(teamId: number, pageIndex = 0, pageSize?: number): Promise<SupporterTeam[]> {
    const v: Record<string, string> = {
      actionType: "mysupporters",
      pageIndex: String(pageIndex),
      teamId: String(teamId),
    };
    if (pageSize) v.pageSize = String(pageSize);
    return mapMySupporters(await this.get(SUPPORTERS_FILE, SUPPORTERS_VERSION, v));
  }

  // --- staff & youth avatars ---

  /** Trainer and staff avatars for the user's own team. */
  async getMyStaffAvatars(): Promise<StaffAvatars> {
    return mapStaffAvatars(await this.get(STAFFAVATARS_FILE, STAFFAVATARS_VERSION, {}));
  }

  /** Trainer and staff avatars for the given team. */
  async getStaffAvatars(teamId: number): Promise<StaffAvatars> {
    return mapStaffAvatars(
      await this.get(STAFFAVATARS_FILE, STAFFAVATARS_VERSION, { teamId: String(teamId) }),
    );
  }

  /** Youth player avatars for the user's own youth team. */
  async getMyYouthAvatars(): Promise<YouthPlayerAvatar[]> {
    return mapYouthAvatars(await this.get(YOUTHAVATARS_FILE, YOUTHAVATARS_VERSION, {}));
  }

  /** Youth player avatars for the given youth team. */
  async getYouthAvatars(youthTeamId: number): Promise<YouthPlayerAvatar[]> {
    return mapYouthAvatars(
      await this.get(YOUTHAVATARS_FILE, YOUTHAVATARS_VERSION, { youthTeamId: String(youthTeamId) }),
    );
  }

  // --- world languages / translations ---

  /** All Hattrick languages. */
  async getWorldLanguages(): Promise<WorldLanguage[]> {
    return mapWorldLanguages(await this.get(WORLDLANGUAGES_FILE, WORLDLANGUAGES_VERSION, {}));
  }

  /** UI translations (skill names, levels, specialties, etc.) for a language. */
  async getTranslations(languageId: number): Promise<Translations> {
    return mapTranslations(
      await this.get(TRANSLATIONS_FILE, TRANSLATIONS_VERSION, { languageId: String(languageId) }),
    );
  }

  // --- bookmarks ---

  /** The user's bookmarks of the given type. */
  async getBookmarks(bookmarkType: number): Promise<Bookmark[]> {
    return mapBookmarks(
      await this.get(BOOKMARKS_FILE, BOOKMARKS_VERSION, { BookmarkTypeID: String(bookmarkType) }),
    );
  }

  // --- achievements ---

  /** The user's own achievements. */
  async getMyAchievements(): Promise<Achievement[]> {
    return mapAchievements(await this.get(ACHIEVEMENTS_FILE, ACHIEVEMENTS_VERSION, {}));
  }

  /** A given user's achievements. */
  async getAchievements(userId: number): Promise<Achievement[]> {
    return mapAchievements(
      await this.get(ACHIEVEMENTS_FILE, ACHIEVEMENTS_VERSION, { userID: String(userId) }),
    );
  }

  // --- search ---

  /** Search by type (teams, players, …) with optional filters. */
  async search(
    searchType: number,
    searchString = "",
    filters: { searchString2?: string; searchId?: number; searchLeagueId?: number; pageIndex?: number } = {},
  ): Promise<SearchResult[]> {
    const v: Record<string, string> = {
      searchType: String(searchType),
      pageIndex: String(filters.pageIndex ?? 0),
    };
    if (searchString) v.searchString = searchString;
    if (filters.searchString2) v.searchString2 = filters.searchString2;
    if (filters.searchId) v.searchID = String(filters.searchId);
    if (filters.searchLeagueId) v.searchLeagueID = String(filters.searchLeagueId);
    return mapSearch(await this.get(SEARCH_FILE, SEARCH_VERSION, v));
  }

  // --- world details ---

  /** All leagues (countries), without region lists. */
  async getWorld(): Promise<League[]> {
    return mapWorldDetails(
      await this.get(WORLDDETAILS_FILE, WORLDDETAILS_VERSION, { includeRegions: "false" }),
    );
  }

  /** A single league by id (includes regions). */
  async getLeague(leagueId: number): Promise<League | undefined> {
    const leagues = mapWorldDetails(
      await this.get(WORLDDETAILS_FILE, WORLDDETAILS_VERSION, {
        includeRegions: "true",
        leagueID: String(leagueId),
      }),
    );
    return leagues[0];
  }

  /** A single country/league by country id (includes regions). */
  async getCountry(countryId: number): Promise<League | undefined> {
    const leagues = mapWorldDetails(
      await this.get(WORLDDETAILS_FILE, WORLDDETAILS_VERSION, {
        includeRegions: "true",
        countryID: String(countryId),
      }),
    );
    return leagues[0];
  }

  // --- manager ---

  /** The requesting manager's own compendium (profile + teams). */
  async getMe(): Promise<Manager> {
    return mapManager(await this.get(MANAGERCOMPENDIUM_FILE, MANAGERCOMPENDIUM_VERSION, {}));
  }

  /** A given manager's compendium. */
  async getManager(userId: number): Promise<Manager> {
    return mapManager(
      await this.get(MANAGERCOMPENDIUM_FILE, MANAGERCOMPENDIUM_VERSION, { userId: String(userId) }),
    );
  }

  // --- series (league) standings ---

  /** The user's own series standings table. */
  async getMySeries(): Promise<Series> {
    return mapSeries(await this.get(LEAGUEDETAILS_FILE, LEAGUEDETAILS_VERSION, {}));
  }

  /** A given series' standings table. */
  async getSeries(seriesId: number): Promise<Series> {
    return mapSeries(
      await this.get(LEAGUEDETAILS_FILE, LEAGUEDETAILS_VERSION, {
        leagueLevelUnitID: String(seriesId),
      }),
    );
  }

  // --- series fixtures ---

  /** The user's own series fixtures (optionally for a given season). */
  async getMySeriesFixtures(season?: number): Promise<SeriesFixtures> {
    const v: Record<string, string> = {};
    if (season !== undefined) v.season = String(season);
    return mapSeriesFixtures(await this.get(LEAGUEFIXTURES_FILE, LEAGUEFIXTURES_VERSION, v));
  }

  /** A given series' fixtures (optionally for a given season). */
  async getSeriesFixtures(seriesId: number, season?: number): Promise<SeriesFixtures> {
    const v: Record<string, string> = { leagueLevelUnitID: String(seriesId) };
    if (season !== undefined) v.season = String(season);
    return mapSeriesFixtures(await this.get(LEAGUEFIXTURES_FILE, LEAGUEFIXTURES_VERSION, v));
  }

  // --- youth team ---

  /** The user's own youth team (optionally including scouts). */
  async getMyYouthTeam(showScouts = false): Promise<YouthTeamDetails> {
    const v: Record<string, string> = {};
    if (showScouts) v.showScouts = "true";
    return mapYouthTeamDetails(await this.get(YOUTHTEAMDETAILS_FILE, YOUTHTEAMDETAILS_VERSION, v));
  }

  /** A given youth team (optionally including scouts). */
  async getYouthTeam(youthTeamId: number, showScouts = false): Promise<YouthTeamDetails> {
    const v: Record<string, string> = { youthTeamId: String(youthTeamId) };
    if (showScouts) v.showScouts = "true";
    return mapYouthTeamDetails(await this.get(YOUTHTEAMDETAILS_FILE, YOUTHTEAMDETAILS_VERSION, v));
  }

  // --- youth players ---

  /** The user's own youth squad (set details:true for skills/scout/match). */
  async getMyYouthPlayers(
    opts: { details?: boolean; showScoutCall?: boolean; showLastMatch?: boolean } = {},
  ): Promise<YouthPlayer[]> {
    return mapYouthPlayerList(
      await this.get(YOUTHPLAYERLIST_FILE, YOUTHPLAYERLIST_VERSION, youthPlayerParams(opts)),
    );
  }

  /** A given youth team's squad (set details:true for skills/scout/match). */
  async getYouthPlayers(
    youthTeamId: number,
    opts: { details?: boolean; showScoutCall?: boolean; showLastMatch?: boolean } = {},
  ): Promise<YouthPlayer[]> {
    const v = youthPlayerParams(opts);
    v.youthTeamID = String(youthTeamId);
    return mapYouthPlayerList(await this.get(YOUTHPLAYERLIST_FILE, YOUTHPLAYERLIST_VERSION, v));
  }

  /** A single youth player's details. */
  async getYouthPlayer(
    youthPlayerId: number,
    opts: { showScoutCall?: boolean; showLastMatch?: boolean } = {},
  ): Promise<YouthPlayer> {
    const v = youthPlayerParams(opts);
    v.youthPlayerId = String(youthPlayerId);
    return mapYouthPlayerDetails(
      await this.get(YOUTHPLAYERDETAILS_FILE, YOUTHPLAYERDETAILS_VERSION, v),
    );
  }

  // --- youth league ---

  /** The user's own youth league standings. */
  async getMyYouthLeague(): Promise<YouthLeagueDetails> {
    return mapYouthLeagueDetails(await this.get(YOUTHLEAGUEDETAILS_FILE, YOUTHLEAGUEDETAILS_VERSION, {}));
  }

  /** A given youth league's standings. */
  async getYouthLeague(youthLeagueId: number): Promise<YouthLeagueDetails> {
    return mapYouthLeagueDetails(
      await this.get(YOUTHLEAGUEDETAILS_FILE, YOUTHLEAGUEDETAILS_VERSION, {
        youthleagueid: String(youthLeagueId),
      }),
    );
  }

  /** The user's own youth league fixtures. */
  async getMyYouthLeagueFixtures(): Promise<YouthLeagueFixtures> {
    return mapYouthLeagueFixtures(
      await this.get(YOUTHLEAGUEFIXTURES_FILE, YOUTHLEAGUEFIXTURES_VERSION, {}),
    );
  }

  /** A given youth league's fixtures (optionally a given season). */
  async getYouthLeagueFixtures(youthLeagueId: number, season?: number): Promise<YouthLeagueFixtures> {
    const v: Record<string, string> = { youthleagueid: String(youthLeagueId) };
    if (season !== undefined && season !== 0) v.season = String(season);
    return mapYouthLeagueFixtures(await this.get(YOUTHLEAGUEFIXTURES_FILE, YOUTHLEAGUEFIXTURES_VERSION, v));
  }

  // --- national teams ---

  /** The national/U20 teams and cup teams for a league-office type. */
  async getNationalTeams(leagueOfficeTypeId: number): Promise<NationalTeamsList> {
    return mapNationalTeams(
      await this.get(NATIONALTEAMS_FILE, NATIONALTEAMS_VERSION, {
        LeagueOfficeTypeID: String(leagueOfficeTypeId),
      }),
    );
  }

  /** A national team's details. */
  async getNationalTeamDetails(teamId: number): Promise<NationalTeamDetails> {
    return mapNationalTeamDetails(
      await this.get(NATIONALTEAMDETAILS_FILE, NATIONALTEAMDETAILS_VERSION, { teamID: String(teamId) }),
    );
  }

  /** A national team's current squad. */
  async getNationalTeamPlayers(teamId: number): Promise<NationalTeamPlayer[]> {
    return mapNationalPlayers(
      await this.get(NATIONALPLAYERS_FILE, NATIONALPLAYERS_VERSION, {
        actionType: "view",
        teamID: String(teamId),
      }),
    );
  }

  /** A national team's cap/appearance stats. */
  async getNationalTeamPlayerStats(
    teamId: number,
    opts: { matchTypeCategory?: string; showAll?: boolean } = {},
  ): Promise<NationalPlayersStats> {
    const v: Record<string, string> = {
      actionType: "SupporterStats",
      teamID: String(teamId),
      ShowAll: String(opts.showAll ?? false),
    };
    if (opts.matchTypeCategory) v.MatchTypeCategory = opts.matchTypeCategory;
    return mapNationalPlayersStats(await this.get(NATIONALPLAYERS_FILE, NATIONALPLAYERS_VERSION, v));
  }

  /** Upcoming national-team matches for a league-office type. */
  async getNationalTeamMatches(leagueOfficeTypeId: number): Promise<NationalTeamMatch[]> {
    return mapNationalTeamMatches(
      await this.get(NATIONALTEAMMATCHES_FILE, NATIONALTEAMMATCHES_VERSION, {
        LeagueOfficeTypeID: String(leagueOfficeTypeId),
      }),
    );
  }

  // --- world cup ---

  /** World Cup group standings for a season/round (cupId 0 = current). */
  async getWorldCupGroups(cupId: number, season: number, matchRound = 0): Promise<WorldCupScore[]> {
    const v: Record<string, string> = { actionType: "viewGroups", season: String(season) };
    if (cupId) v.cupID = String(cupId);
    if (matchRound) v.matchRound = String(matchRound);
    return mapWorldCupScores(await this.get(WORLDCUP_FILE, WORLDCUP_VERSION, v));
  }

  /** World Cup matches for a group (cupSeriesUnitID) and season. */
  async getWorldCupMatches(cupId: number, season: number, cupSeriesUnitId: number): Promise<WorldCupMatch[]> {
    const v: Record<string, string> = {
      actionType: "viewMatches",
      season: String(season),
      cupSeriesUnitID: String(cupSeriesUnitId),
    };
    if (cupId) v.cupID = String(cupId);
    return mapWorldCupMatches(await this.get(WORLDCUP_FILE, WORLDCUP_VERSION, v));
  }

  // --- tournaments ---

  /** Tournaments the user's own team takes part in. */
  async getMyTournaments(): Promise<Tournament[]> {
    return mapTournamentList(await this.get(TOURNAMENTLIST_FILE, TOURNAMENTLIST_VERSION, {}));
  }

  /** Tournaments a given team takes part in. */
  async getTournaments(teamId: number): Promise<Tournament[]> {
    return mapTournamentList(
      await this.get(TOURNAMENTLIST_FILE, TOURNAMENTLIST_VERSION, { teamId: String(teamId) }),
    );
  }

  /** A single tournament's details (optionally a given season). */
  async getTournament(tournamentId: number, season?: number): Promise<Tournament> {
    const v: Record<string, string> = { tournamentId: String(tournamentId) };
    if (season !== undefined && season !== 0) v.season = String(season);
    return mapTournamentDetails(await this.get(TOURNAMENTDETAILS_FILE, TOURNAMENTDETAILS_VERSION, v));
  }

  /** A tournament's fixtures (optionally a given season or match round). */
  async getTournamentFixtures(
    tournamentId: number,
    opts: { season?: number; matchRound?: number } = {},
  ): Promise<TournamentFixture[]> {
    const v: Record<string, string> = { tournamentId: String(tournamentId) };
    if (opts.season) v.season = String(opts.season);
    if (opts.matchRound) v.matchRound = String(opts.matchRound);
    return mapTournamentFixtures(await this.get(TOURNAMENTFIXTURES_FILE, TOURNAMENTFIXTURES_VERSION, v));
  }

  /** A tournament's group league tables (optionally season / world-cup round). */
  async getTournamentLeagueTables(
    tournamentId: number,
    opts: { season?: number; worldCupRound?: number } = {},
  ): Promise<TournamentLeagueTable[]> {
    const v: Record<string, string> = { tournamentId: String(tournamentId) };
    if (opts.season) v.season = String(opts.season);
    if (opts.worldCupRound) v.worldCupRound = String(opts.worldCupRound);
    return mapTournamentLeagueTables(
      await this.get(TOURNAMENTLEAGUETABLES_FILE, TOURNAMENTLEAGUETABLES_VERSION, v),
    );
  }

  // --- alliances ---

  /** Alliances the user belongs to. */
  async getMyAlliances(): Promise<Alliance[]> {
    return mapAlliances(await this.get(ALLIANCES_FILE, ALLIANCES_VERSION, { SearchType: "5" }));
  }

  /**
   * Search alliances. searchType: 1 name-starts-with, 2 abbreviation-includes,
   * 3 description-includes, 4 by alliance id.
   */
  async searchAlliances(
    searchType: number,
    searchFor: string,
    searchLanguageId: number,
    pageIndex = 0,
  ): Promise<Alliance[]> {
    return mapAlliances(
      await this.get(ALLIANCES_FILE, ALLIANCES_VERSION, {
        SearchType: String(searchType),
        SearchFor: searchFor,
        SearchLanguageID: String(searchLanguageId),
        PageIndex: String(pageIndex),
      }),
    );
  }

  /** A single alliance's details, roles and members. */
  async getAllianceDetails(allianceId: number): Promise<Alliance> {
    return mapAllianceDetails(
      await this.get(ALLIANCEDETAILS_FILE, ALLIANCEDETAILS_VERSION, {
        actionType: "view",
        allianceID: String(allianceId),
      }),
    );
  }

  // --- live ---

  /** The user's followed live matches (optionally a specific match id). */
  async getLiveMatches(
    opts: {
      matchId?: number;
      sourceSystem?: string;
      includeStartingLineup?: boolean;
      useLiveEventsAndTexts?: boolean;
    } = {},
  ): Promise<LiveMatch[]> {
    const v: Record<string, string> = {};
    if (opts.sourceSystem) v.sourceSystem = opts.sourceSystem;
    if (opts.includeStartingLineup) v.includeStartingLineup = "true";
    if (opts.useLiveEventsAndTexts) v.useLiveEventsAndTexts = "true";
    if (opts.matchId) v.matchID = String(opts.matchId);
    return mapLiveMatches(await this.get(LIVE_FILE, LIVE_VERSION, v));
  }

  // --- training events ---

  /** A player's skill-up training events. */
  async getTrainingEvents(playerId: number): Promise<TrainingEvent[]> {
    return mapTrainingEvents(
      await this.get(TRAININGEVENTS_FILE, TRAININGEVENTS_VERSION, { playerID: String(playerId) }),
    );
  }

  // --- challenges (read) ---

  /** The team's arranged friendlies and pending offers. */
  async getChallenges(weekend = false): Promise<Challenges> {
    const v: Record<string, string> = { actionType: "view" };
    if (weekend) v.isWeekendFriendly = "1";
    return mapChallenges(await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, v));
  }

  /** Whether the given teams can be challenged to a friendly. */
  async areChallengeable(teamIds: number[], weekend = false): Promise<ChallengeableResult[]> {
    const v: Record<string, string> = {
      actionType: "challengeable",
      suggestedTeamIds: teamIds.join(","),
    };
    if (weekend) v.isWeekendFriendly = "1";
    return mapChallengeable(await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, v));
  }

  // --- match orders (read) ---

  /** The currently-set orders (lineup, bench, kickers, subs) for a match. */
  async getMatchOrders(
    matchId: number,
    teamId: number,
    sourceSystem = "hattrick",
  ): Promise<MatchOrders> {
    return mapMatchOrders(
      await this.get(MATCHORDERS_FILE, MATCHORDERS_VERSION, {
        actionType: "view",
        matchID: String(matchId),
        teamId: String(teamId),
        sourceSystem,
      }),
    );
  }

  // =========================================================================
  // Mutating / action endpoints (change the account)
  // =========================================================================

  // --- match orders (write) ---

  /** Save a lineup for a match (CHPP matchorders lineup JSON). */
  async setMatchOrders(
    matchId: number,
    teamId: number,
    lineup: string,
    sourceSystem = "hattrick",
  ): Promise<MatchOrders> {
    return mapMatchOrders(
      await this.post(
        MATCHORDERS_FILE,
        MATCHORDERS_VERSION,
        { actionType: "setmatchorder", matchID: String(matchId), teamId: String(teamId), sourceSystem },
        lineup,
      ),
    );
  }

  /** Predict the ratings a lineup would give, without saving it. */
  async predictRatings(
    matchId: number,
    teamId: number,
    lineup: string,
    sourceSystem = "hattrick",
  ): Promise<MatchOrders> {
    return mapMatchOrders(
      await this.post(
        MATCHORDERS_FILE,
        MATCHORDERS_VERSION,
        { actionType: "predictratings", matchID: String(matchId), teamId: String(teamId), sourceSystem },
        lineup,
      ),
    );
  }

  // --- transfer bids ---

  /** Place a bid on a transfer-listed player (Supporters only). */
  async placeBid(
    playerId: number,
    teamId: number,
    bidAmountSek: number,
    maxBidAmountSek = 0,
  ): Promise<PlayerDetails> {
    const v: Record<string, string> = {
      actionType: "placeBid",
      playerID: String(playerId),
      teamId: String(teamId),
      bidAmount: String(bidAmountSek),
    };
    if (maxBidAmountSek) v.maxBidAmount = String(maxBidAmountSek);
    return mapPlayerDetails(await this.get(PLAYERDETAILS_FILE, PLAYERDETAILS_VERSION, v));
  }

  /** Stop tracking all finished transfers (Supporters only). */
  async deleteAllFinishedBids(): Promise<void> {
    await this.get(CURRENTBIDS_FILE, CURRENTBIDS_VERSION, { actionType: "deleteAllFinished" });
  }

  /** Stop tracking a specific transfer (trackingTypeId 5, 8 or 9). */
  async ignoreTransfer(transferId: number, trackingTypeId: number): Promise<void> {
    await this.get(CURRENTBIDS_FILE, CURRENTBIDS_VERSION, {
      actionType: "ignoreTransfer",
      transferId: String(transferId),
      trackingTypeId: String(trackingTypeId),
    });
  }

  // --- youth skill unlocking ---

  /** Unlock all skills for the whole youth team; returns the updated squad. */
  async unlockYouthTeamSkills(
    youthTeamId: number,
    opts: { showScoutCall?: boolean; showLastMatch?: boolean } = {},
  ): Promise<YouthPlayer[]> {
    const v = youthPlayerParams(opts);
    v.actionType = "unlockskills";
    v.youthTeamID = String(youthTeamId);
    return mapYouthPlayerList(await this.get(YOUTHPLAYERLIST_FILE, YOUTHPLAYERLIST_VERSION, v));
  }

  /** Unlock a single youth player's skills; returns his updated details. */
  async unlockYouthPlayerSkills(
    youthPlayerId: number,
    opts: { showScoutCall?: boolean; showLastMatch?: boolean } = {},
  ): Promise<YouthPlayer> {
    const v = youthPlayerParams(opts);
    v.actionType = "unlockskills";
    v.youthPlayerId = String(youthPlayerId);
    return mapYouthPlayerDetails(await this.get(YOUTHPLAYERDETAILS_FILE, YOUTHPLAYERDETAILS_VERSION, v));
  }

  // --- live match following ---

  /** Add a match to the followed live matches. */
  async addLiveMatch(
    matchId: number,
    opts: { sourceSystem?: string; includeStartingLineup?: boolean; useLiveEventsAndTexts?: boolean } = {},
  ): Promise<LiveMatch[]> {
    const v = liveParams(opts);
    v.actionType = "addMatch";
    v.matchID = String(matchId);
    return mapLiveMatches(await this.get(LIVE_FILE, LIVE_VERSION, v));
  }

  /** Remove a match from the followed live matches. */
  async deleteLiveMatch(matchId: number, sourceSystem?: string): Promise<LiveMatch[]> {
    const v: Record<string, string> = { actionType: "deleteMatch", matchID: String(matchId) };
    if (sourceSystem) v.sourceSystem = sourceSystem;
    return mapLiveMatches(await this.get(LIVE_FILE, LIVE_VERSION, v));
  }

  /** Clear all followed live matches. */
  async clearLiveMatches(): Promise<void> {
    await this.get(LIVE_FILE, LIVE_VERSION, { actionType: "clearAll" });
  }

  // --- challenges (write) ---

  /** Challenge a team to a friendly. matchPlace: 0 my arena, 1 their arena, 2 neutral. */
  async challenge(
    opponentTeamId: number,
    friendlyType: number,
    matchPlace: number,
    opts: { neutralArenaId?: number; weekend?: boolean } = {},
  ): Promise<void> {
    const v: Record<string, string> = {
      actionType: "challenge",
      opponentTeamId: String(opponentTeamId),
      matchType: String(friendlyType),
      matchPlace: String(matchPlace),
    };
    if (opts.neutralArenaId) v.neutralArenaId = String(opts.neutralArenaId);
    if (opts.weekend) v.isWeekendFriendly = "1";
    await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, v);
  }

  /** Accept a friendly offer. */
  async acceptChallenge(friendlyMatchId: number): Promise<void> {
    await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, {
      actionType: "accept",
      trainingMatchId: String(friendlyMatchId),
    });
  }

  /** Decline a friendly offer. */
  async declineChallenge(friendlyMatchId: number): Promise<void> {
    await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, {
      actionType: "decline",
      trainingMatchId: String(friendlyMatchId),
    });
  }

  /** Withdraw a challenge you made. */
  async withdrawChallenge(friendlyMatchId: number): Promise<void> {
    await this.get(CHALLENGES_FILE, CHALLENGES_VERSION, {
      actionType: "withdraw",
      trainingMatchId: String(friendlyMatchId),
    });
  }

  // --- team details (full) ---

  /** Full team details (name, league, series, arena, cup, fanclub, etc.) for
   *  every team of a user; omit userId for yourself. */
  async getTeamDetailsFull(userId?: number): Promise<TeamDetailsFull> {
    const v: Record<string, string> = {
      includeDomesticFlags: "true",
      includeFlags: "true",
      includeSupporters: "true",
    };
    if (userId) v.userID = String(userId);
    return mapTeamDetailsFull(await this.get(TEAMDETAILS_FULL_FILE, TEAMDETAILS_FULL_VERSION, v));
  }

  /** All of the user's own teams, full details. */
  async getMyTeams(): Promise<Team[]> {
    return (await this.getTeamDetailsFull()).teams;
  }

  /** All of a manager's teams, full details. */
  async getTeamsByUser(userId: number): Promise<Team[]> {
    return (await this.getTeamDetailsFull(userId)).teams;
  }

  /** The user's own primary team, full details. */
  async getMyPrimaryTeam(): Promise<Team | undefined> {
    const teams = await this.getMyTeams();
    return teams.find((t) => t.isPrimaryClub) ?? teams[0];
  }

  /** A manager's primary team, full details. */
  async getPrimaryTeamByUser(userId: number): Promise<Team | undefined> {
    const teams = await this.getTeamsByUser(userId);
    return teams.find((t) => t.isPrimaryClub) ?? teams[0];
  }

  /** A given team's full details. */
  async getTeam(teamId: number): Promise<Team | undefined> {
    const d = await this.getTeamDetailsFull();
    const found = d.teams.find((t) => t.id === teamId);
    if (found) return found;
    // Not one of the user's own teams — fetch it directly.
    const v: Record<string, string> = {
      includeDomesticFlags: "true",
      includeFlags: "true",
      includeSupporters: "true",
      teamID: String(teamId),
    };
    const other = mapTeamDetailsFull(await this.get(TEAMDETAILS_FULL_FILE, TEAMDETAILS_FULL_VERSION, v));
    return other.teams.find((t) => t.id === teamId) ?? other.teams[0];
  }

  // --- live events ---

  /** All live events for the matches on the live list. */
  async getAllLiveEvents(
    opts: { includeStartingLineup?: boolean; useLiveEventsAndTexts?: boolean } = {},
  ): Promise<LiveMatch[]> {
    const v = liveParams(opts);
    v.actionType = "viewAll";
    return mapLiveMatches(await this.get(LIVE_FILE, LIVE_VERSION, v));
  }

  /** Live events since the given last-shown indexes. */
  async getNewLiveEvents(
    lastShownIndexes = "",
    opts: { includeStartingLineup?: boolean; useLiveEventsAndTexts?: boolean } = {},
  ): Promise<LiveMatch[]> {
    const v = liveParams(opts);
    v.actionType = "viewNew";
    if (lastShownIndexes) v.lastShownIndexes = lastShownIndexes;
    return mapLiveMatches(await this.get(LIVE_FILE, LIVE_VERSION, v));
  }

  // --- training (write) ---

  /** Change training type, intensity and stamina share; returns the updated view. */
  async setTraining(
    teamId: number,
    trainingType: number,
    level: number,
    staminaLevel: number,
  ): Promise<Training> {
    return mapTraining(
      await this.get(TRAINING_FILE, TRAINING_VERSION, {
        actionType: "setTraining",
        teamId: String(teamId),
        trainingType: String(trainingType),
        trainingLevel: String(level),
        trainingLevelStamina: String(staminaLevel),
      }),
    );
  }
}

function matchParams(isYouth: boolean, teamId?: number, until?: string): Record<string, string> {
  const v: Record<string, string> = { isYouth: String(isYouth) };
  if (teamId) v.teamID = String(teamId);
  if (until) v.LastMatchDate = until;
  return v;
}

function liveParams(opts: {
  sourceSystem?: string;
  includeStartingLineup?: boolean;
  useLiveEventsAndTexts?: boolean;
}): Record<string, string> {
  const v: Record<string, string> = {};
  if (opts.sourceSystem) v.sourceSystem = opts.sourceSystem;
  if (opts.includeStartingLineup) v.includeStartingLineup = "true";
  if (opts.useLiveEventsAndTexts) v.useLiveEventsAndTexts = "true";
  return v;
}

function youthPlayerParams(opts: {
  details?: boolean;
  showScoutCall?: boolean;
  showLastMatch?: boolean;
}): Record<string, string> {
  const v: Record<string, string> = {};
  if (opts.details) v.actionType = "details";
  if (opts.showScoutCall) v.showScoutCall = "true";
  if (opts.showLastMatch) v.showLastMatch = "true";
  return v;
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
    gender: num(p["GenderID"]),
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
      leagueSystemId: num(t["LeagueSystemID"]),
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
