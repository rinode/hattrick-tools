import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, type ZodRawShape } from "zod";
import type { HattrickClient } from "hattrick-chpp-node";
import type { Account } from "./account.js";
import { TtlCache } from "./cache.js";
import { buildLineup, type SetLineupInput } from "./lineup.js";
import {
  humanizeAvatars,
  humanizeEconomy,
  humanizeLadderDetails,
  humanizeLadders,
  humanizeMatches,
  humanizeTeamPlayers,
  humanizeTraining,
  humanizeTransfers,
  plain,
} from "./humanize.js";

export const INSTRUCTIONS = `Access to the authorised manager's Hattrick.org data via CHPP.
If a tool reports "not logged in", call login, open the URL, then complete_login with the code.
Omit an ID argument to get the manager's own team, series or match data.
Fields that are empty strings, empty lists or unset are left out; numeric zeros and false are kept.
Skill values read "name (n)" on the 0 (non-existent) to 20 (divine) scale. Money is shown in EUR (CHPP reports SEK; 10 SEK = 1 EUR).
Tools whose name starts with set_, place_, ignore_, delete_, clear_, challenge, accept_, decline_ or withdraw_ change the live account. They do nothing until called again with "confirm": true.`;

export interface ServerOptions {
  ttlMs?: number;
  version?: string;
}

const HINTS: Record<string, string> = {
  "10": "invalid parameter — check the arguments",
  "50": "not found",
  "54": "no youth team yet — create one in Hattrick first",
  "58": "no youth league yet",
  "70": "not logged in or the access token was revoked — run login again",
  "71": "bid rejected — your raise is below the minimum, or you hold too many active max-bids",
  "99": "not authorised, or required parameters are missing (you may need to own or belong to this)",
};

async function friendly<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/\((\d+)\)/);
    if (m && HINTS[m[1]!]) throw new Error(`${HINTS[m[1]!]} (CHPP error ${m[1]})`);
    throw e;
  }
}

const SOURCE = z.enum(["hattrick", "youth", "htointegrated"]).optional();

/** Builds the Hattrick MCP server: full read + write CHPP tool set. */
export function buildServer(account: Account, opts: ServerOptions = {}): McpServer {
  const cache = new TtlCache(opts.ttlMs ?? 5 * 60 * 1000);
  const server = new McpServer(
    { name: "hattrick-mcp", version: opts.version ?? "0.0.0" },
    { instructions: INSTRUCTIONS },
  );

  const text = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(plain(value), null, 2) }],
  });

  // read registers a cached, read-only tool.
  function read<S extends ZodRawShape>(
    name: string,
    description: string,
    inputSchema: S,
    fn: (ht: HattrickClient, a: Record<string, unknown>) => Promise<unknown>,
  ): void {
    server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint: true } }, (async (
      a: Record<string, unknown>,
    ) => {
      const ht = account.client();
      const out = await cache.get(name + JSON.stringify(a ?? {}), () => friendly(() => fn(ht, a ?? {})));
      return text(out);
    }) as never);
  }

  // write registers a tool that changes the live account; gated on confirm:true.
  function write<S extends ZodRawShape>(
    name: string,
    description: string,
    inputSchema: S,
    fn: (ht: HattrickClient, a: Record<string, unknown>) => Promise<unknown>,
  ): void {
    server.registerTool(
      name,
      {
        description: `${description} Set "confirm": true to apply; without it the tool only reports what it would do.`,
        inputSchema: { ...inputSchema, confirm: z.boolean().optional() },
        annotations: { destructiveHint: true },
      },
      (async (a: Record<string, unknown>) => {
        if (!a?.confirm) {
          return text({ note: "Not applied. This changes the live Hattrick account. Call again with confirm:true to apply." });
        }
        const ht = account.client();
        return text(await friendly(() => fn(ht, a)));
      }) as never,
    );
  }

  // --- login ---
  server.registerTool(
    "login",
    {
      description:
        "Start the Hattrick login. Returns a URL where the manager grants access and gets a verification code; then call complete_login with that code.",
      inputSchema: {},
    },
    (async () => {
      const url = await account.login();
      return text({ instructions: "Open this URL, grant access, then call complete_login with the code.", url });
    }) as never,
  );
  server.registerTool(
    "complete_login",
    {
      description: "Finish the Hattrick login with the verification code from the login URL.",
      inputSchema: { code: z.string().describe("verification code Hattrick shows after granting access") },
    },
    (async (a: { code: string }) => {
      await account.completeLogin(a.code);
      return text({ status: "Logged in." });
    }) as never,
  );

  const teamId = { team_id: z.number().int().positive().optional() };
  const paged = { page_index: z.number().int().nonnegative().optional(), page_size: z.number().int().positive().optional() };

  // ===== manager / team / club =====
  read("get_manager", "Manager profile: username, country, supporter tier and teams.", { user_id: z.number().int().positive().optional() },
    (ht, a) => (a.user_id ? ht.getManager(a.user_id as number) : ht.getMe()));
  read("get_team", "Team details: name, league, series, arena, trainer, fan club, cup, power rating and rank.",
    { ...teamId, user_id: z.number().int().positive().optional() },
    (ht, a) => (a.user_id ? ht.getPrimaryTeamByUser(a.user_id as number) : a.team_id ? ht.getTeam(a.team_id as number) : ht.getMyPrimaryTeam()));
  read("get_teams", "All teams of a manager (a manager may have several).", { user_id: z.number().int().positive().optional() },
    (ht, a) => (a.user_id ? ht.getTeamsByUser(a.user_id as number) : ht.getMyTeams()));
  read("get_club", "Club-wide staff specialist levels and youth-squad status.", teamId,
    (ht, a) => (a.team_id ? ht.getClub(a.team_id as number) : ht.getMyClub()));
  read("get_region", "Region details: name, users online and teams, weather.", { region_id: z.number().int().positive().optional() },
    (ht, a) => (a.region_id ? ht.getRegion(a.region_id as number) : ht.getMyRegion()));
  read("get_achievements", "A manager's achievements and the points earned.", { user_id: z.number().int().positive().optional() },
    (ht, a) => (a.user_id ? ht.getAchievements(a.user_id as number) : ht.getMyAchievements()));

  // ===== players =====
  read("get_players", "Senior squad with age, form, skills, TSI, salary (EUR), specialty, injuries and cards.",
    { ...teamId, order_by: z.string().optional() },
    async (ht, a) => humanizeTeamPlayers(await (a.team_id ? ht.getPlayers(a.team_id as number, a.order_by as string | undefined) : ht.getMyPlayers(a.order_by as string | undefined))));
  read("get_player", "Full details of one player: skills, transfer status and last match.", { player_id: z.number().int().positive() },
    (ht, a) => ht.getPlayerDetails(a.player_id as number));
  read("get_player_events", "Career events of a player (milestones, transfers, bookings).", { player_id: z.number().int().positive() },
    (ht, a) => ht.getPlayerEvents(a.player_id as number));
  read("get_player_transfer_history", "All transfers of a player with dates and prices.", { player_id: z.number().int().positive() },
    (ht, a) => ht.getPlayerTransferHistory(a.player_id as number));
  read("get_old_players", "Former senior players of a team.", teamId,
    async (ht, a) => humanizeTeamPlayers(await (a.team_id ? ht.getOldPlayers(a.team_id as number) : ht.getMyOldPlayers())));
  read("get_old_coaches", "Former trainers of a team.", teamId,
    async (ht, a) => humanizeTeamPlayers(await (a.team_id ? ht.getOldCoaches(a.team_id as number) : ht.getMyOldCoaches())));
  read("get_hof_players", "Hall of fame players of a team.", teamId,
    (ht, a) => (a.team_id ? ht.getHofPlayers(a.team_id as number) : ht.getMyHofPlayers()));
  read("get_avatars", "Layered avatar recipes for players, hall of fame, staff or youth.",
    { kind: z.enum(["players", "hof", "staff", "youth"]).optional(), id: z.number().int().positive().optional() },
    async (ht, a) => {
      const id = a.id as number | undefined;
      switch (a.kind) {
        case "hof":
          return humanizeAvatars(await (id ? ht.getAvatars(id, "hof") : ht.getMyAvatars("hof")));
        case "staff":
          return id ? ht.getStaffAvatars(id) : ht.getMyStaffAvatars();
        case "youth":
          return id ? ht.getYouthAvatars(id) : ht.getMyYouthAvatars();
        default:
          return humanizeAvatars(await (id ? ht.getAvatars(id) : ht.getMyAvatars()));
      }
    });

  // ===== matches =====
  const until = { until: z.string().optional() };
  read("get_matches", "Recent and upcoming senior matches of a team.", { ...teamId, ...until },
    async (ht, a) => humanizeMatches(await (a.team_id ? ht.getMatches(a.team_id as number, { until: a.until as string | undefined }) : ht.getMyMatches({ until: a.until as string | undefined }))));
  read("get_youth_matches", "Recent and upcoming youth matches of a team.", { ...teamId, ...until },
    async (ht, a) => humanizeMatches(await (a.team_id ? ht.getYouthMatches(a.team_id as number, { until: a.until as string | undefined }) : ht.getMyYouthMatches({ until: a.until as string | undefined }))));
  const archive = { ...teamId, start: z.string().optional(), end: z.string().optional(), season: z.number().int().positive().optional() };
  read("get_matches_archive", "Played senior matches in a date range or a season.", { ...archive, include_hto: z.boolean().optional() },
    (ht, a) => ht.getMatchesArchive({ teamId: a.team_id as number | undefined, firstMatchDate: a.start as string | undefined, lastMatchDate: a.end as string | undefined, season: a.season as number | undefined, includeHTO: a.include_hto as boolean | undefined }));
  read("get_youth_matches_archive", "Played youth matches in a date range.", archive,
    (ht, a) => ht.getMatchesArchive({ teamId: a.team_id as number | undefined, firstMatchDate: a.start as string | undefined, lastMatchDate: a.end as string | undefined, season: a.season as number | undefined, isYouth: true }));
  read("get_match", "Match details: score, sector ratings, possession, chances, tactics and optionally events.",
    { match_id: z.number().int().positive(), source_system: SOURCE, events: z.boolean().optional() },
    (ht, a) => ht.getMatchDetails(a.match_id as number, { sourceSystem: a.source_system as string | undefined, matchEvents: a.events as boolean | undefined }));
  read("get_match_lineup", "Lineup a team used in a played match, with positions, behaviours and ratings.",
    { match_id: z.number().int().positive(), ...teamId, source_system: SOURCE },
    (ht, a) => ht.getMatchLineup(a.match_id as number, { teamId: a.team_id as number | undefined, sourceSystem: a.source_system as string | undefined }));
  read("get_match_orders", "The orders currently set for an upcoming match: lineup, positions, orders and substitutions.",
    { match_id: z.number().int().positive(), team_id: z.number().int().positive(), source_system: SOURCE },
    (ht, a) => ht.getMatchOrders(a.match_id as number, a.team_id as number, a.source_system as string | undefined));
  read("predict_ratings", "Predict the ratings a lineup (CHPP matchorders JSON) would give, without saving it.",
    { match_id: z.number().int().positive(), team_id: z.number().int().positive(), source_system: SOURCE, lineup: z.string() },
    (ht, a) => ht.predictRatings(a.match_id as number, a.team_id as number, a.lineup as string, (a.source_system as string) || "hattrick"));
  read("get_cup_matches", "Matches of a cup, for a season and round or the latest.",
    { cup_id: z.number().int().positive(), season: z.number().int().positive().optional(), round: z.number().int().positive().optional() },
    (ht, a) => ht.getCupMatches(a.cup_id as number, { season: a.season as number | undefined, round: a.round as number | undefined }));

  // ===== league / world =====
  read("get_series", "League table of a series.", { series_id: z.number().int().positive().optional() },
    (ht, a) => (a.series_id ? ht.getSeries(a.series_id as number) : ht.getMySeries()));
  read("get_series_fixtures", "All fixtures and results of a series for a season.",
    { series_id: z.number().int().positive().optional(), season: z.number().int().positive().optional() },
    (ht, a) => (a.series_id ? ht.getSeriesFixtures(a.series_id as number, a.season as number | undefined) : ht.getMySeriesFixtures(a.season as number | undefined)));
  read("get_league_levels", "The division levels of a country and their series counts.", { league_id: z.number().int().positive().optional() },
    (ht, a) => (a.league_id ? ht.getLeagueLevels(a.league_id as number) : ht.getMyLeagueLevels()));
  read("get_world", "All Hattrick leagues (countries) with season and schedule summary.", {}, (ht) => ht.getWorld());
  read("get_league", "One league (country): season, round, dates and more.", { league_id: z.number().int().positive() },
    (ht, a) => ht.getLeague(a.league_id as number));
  read("get_country", "A country's league data by country ID.", { country_id: z.number().int().positive() },
    (ht, a) => ht.getCountry(a.country_id as number));
  read("get_world_languages", "The languages available in Hattrick.", {}, (ht) => ht.getWorldLanguages());
  read("get_translations", "CHPP term translations for a language.", { language_id: z.number().int().positive() },
    (ht, a) => ht.getTranslations(a.language_id as number));

  // ===== economy / fans / supporters / training / staff / arena =====
  read("get_economy", "Club finances in EUR: cash, this week's and last week's income and costs.", teamId,
    async (ht, a) => humanizeEconomy(await (a.team_id ? ht.getEconomy(a.team_id as number) : ht.getMyEconomy())));
  read("get_fans", "Fan club size, mood and recent/upcoming matches for a team.", teamId,
    (ht, a) => (a.team_id ? ht.getFans(a.team_id as number) : ht.getMyFans()));
  read("get_supported_teams", "Teams a manager supports.", { user_id: z.number().int().positive().optional(), ...paged },
    (ht, a) => (a.user_id ? ht.getSupportedTeams(a.user_id as number, a.page_index as number | undefined, a.page_size as number | undefined) : ht.getMySupportedTeams(a.page_index as number | undefined, a.page_size as number | undefined)));
  read("get_supporters", "Managers who support a team.", { ...teamId, ...paged },
    (ht, a) => (a.team_id ? ht.getSupporters(a.team_id as number, a.page_index as number | undefined, a.page_size as number | undefined) : ht.getMySupporters(a.page_index as number | undefined, a.page_size as number | undefined)));
  read("get_training", "Training type, intensity, stamina share and trainer.", teamId,
    async (ht, a) => humanizeTraining(await (a.team_id ? ht.getTraining(a.team_id as number) : ht.getMyTraining())));
  read("get_training_events", "Skill-up history of one player.", { player_id: z.number().int().positive() },
    (ht, a) => ht.getTrainingEvents(a.player_id as number));
  read("get_staff", "Trainer and staff members of a team with levels and salaries.", teamId,
    (ht, a) => (a.team_id ? ht.getStaff(a.team_id as number) : ht.getMyStaff()));
  read("get_arena", "Arena capacity per seat type and expansions.", { ...teamId, arena_id: z.number().int().positive().optional() },
    (ht, a) => (a.arena_id ? ht.getArena(a.arena_id as number) : a.team_id ? ht.getArenaByTeam(a.team_id as number) : ht.getMyArena()));
  read("get_arena_stats", "Biggest-arena supporter stats across a league (0 = global).", { league_id: z.number().int().nonnegative() },
    (ht, a) => ht.getArenaStats(a.league_id as number));
  read("get_arena_supporter_stats", "Your arena's supporter attendance statistics.", {}, (ht) => ht.getMyArenaSupporterStats());

  // ===== transfers =====
  read("search_transfers", "Search the transfer market by age range and a primary skill filter (prices in EUR). Keep the age span small and skill_max within 4 of skill_min.",
    {
      age_min: z.number().int(), age_max: z.number().int(),
      skill_id: z.number().int().describe("1 keeper, 2 stamina, 3 set pieces, 4 defending, 5 scoring, 6 winger, 7 passing, 8 playmaking, 10 leadership, 11 experience"),
      skill_min: z.number().int().min(0).max(20), skill_max: z.number().int().min(0).max(20),
      price_min_eur: z.number().nonnegative().optional(),
      price_max_eur: z.number().nonnegative().optional(), page_index: z.number().int().nonnegative().optional(),
    },
    async (ht, a) => humanizeTransfers(await ht.searchTransfers({
      ageMin: a.age_min as number, ageMax: a.age_max as number, skillId: a.skill_id as number,
      skillMin: a.skill_min as number, skillMax: a.skill_max as number,
      priceMinSek: a.price_min_eur === undefined ? undefined : (a.price_min_eur as number) * 10,
      priceMaxSek: a.price_max_eur === undefined ? undefined : (a.price_max_eur as number) * 10,
      pageIndex: a.page_index as number | undefined,
    })));
  read("get_current_bids", "Players you are currently bidding on.", {}, (ht) => ht.getCurrentBids());
  read("get_transfers_team", "A team's transfer history (bought and sold) by page.", { ...teamId, page_index: z.number().int().nonnegative().optional() },
    (ht, a) => (a.team_id ? ht.getTransfersTeam(a.team_id as number, a.page_index as number | undefined) : ht.getMyTransfersTeam(a.page_index as number | undefined)));

  // ===== youth =====
  const youthShow = { show_scout_call: z.boolean().optional(), show_last_match: z.boolean().optional() };
  read("get_youth_players", "Youth academy players with known skills, potentials and last match.",
    { youth_team_id: z.number().int().positive().optional(), ...youthShow },
    (ht, a) => {
      const o = { details: true, showScoutCall: a.show_scout_call as boolean | undefined, showLastMatch: a.show_last_match as boolean | undefined };
      return a.youth_team_id ? ht.getYouthPlayers(a.youth_team_id as number, o) : ht.getMyYouthPlayers(o);
    });
  read("get_youth_player", "Full details of one youth player.", { youth_player_id: z.number().int().positive(), ...youthShow },
    (ht, a) => ht.getYouthPlayer(a.youth_player_id as number, { showScoutCall: a.show_scout_call as boolean | undefined, showLastMatch: a.show_last_match as boolean | undefined }));
  read("get_youth_team", "Youth team details and scouts.", { youth_team_id: z.number().int().positive().optional(), show_scouts: z.boolean().optional() },
    (ht, a) => (a.youth_team_id ? ht.getYouthTeam(a.youth_team_id as number, a.show_scouts as boolean | undefined) : ht.getMyYouthTeam(a.show_scouts as boolean | undefined)));
  read("get_youth_league", "Youth league table.", { youth_league_id: z.number().int().positive().optional() },
    (ht, a) => (a.youth_league_id ? ht.getYouthLeague(a.youth_league_id as number) : ht.getMyYouthLeague()));
  read("get_youth_league_fixtures", "Youth league fixtures for a season.", { youth_league_id: z.number().int().positive().optional(), season: z.number().int().positive().optional() },
    (ht, a) => (a.youth_league_id ? ht.getYouthLeagueFixtures(a.youth_league_id as number, a.season as number | undefined) : ht.getMyYouthLeagueFixtures()));

  // ===== tournaments =====
  read("get_tournaments", "Tournaments a team takes part in.", teamId,
    (ht, a) => (a.team_id ? ht.getTournaments(a.team_id as number) : ht.getMyTournaments()));
  read("get_tournament", "Details of one tournament.", { tournament_id: z.number().int().positive(), season: z.number().int().positive().optional() },
    (ht, a) => ht.getTournament(a.tournament_id as number, a.season as number | undefined));
  read("get_tournament_fixtures", "Fixtures of a tournament, by season or match round.",
    { tournament_id: z.number().int().positive(), season: z.number().int().positive().optional(), match_round: z.number().int().positive().optional() },
    (ht, a) => ht.getTournamentFixtures(a.tournament_id as number, { season: a.season as number | undefined, matchRound: a.match_round as number | undefined }));
  read("get_tournament_tables", "League tables of a tournament, by season or world cup round.",
    { tournament_id: z.number().int().positive(), season: z.number().int().positive().optional(), world_cup_round: z.number().int().positive().optional() },
    (ht, a) => ht.getTournamentLeagueTables(a.tournament_id as number, { season: a.season as number | undefined, worldCupRound: a.world_cup_round as number | undefined }));

  // ===== national / world cup =====
  read("get_national_teams", "List of national or U20 teams.", { league_office_type_id: z.number().int().optional() },
    (ht, a) => ht.getNationalTeams((a.league_office_type_id as number) ?? 2));
  read("get_national_team", "Details of one national team.", { national_team_id: z.number().int().positive() },
    (ht, a) => ht.getNationalTeamDetails(a.national_team_id as number));
  read("get_national_team_players", "Players of a national team.", { national_team_id: z.number().int().positive() },
    (ht, a) => ht.getNationalTeamPlayers(a.national_team_id as number));
  read("get_national_team_player_stats", "Player appearance stats for a national team.",
    { national_team_id: z.number().int().positive(), match_type_category: z.string().optional(), show_all: z.boolean().optional() },
    (ht, a) => ht.getNationalTeamPlayerStats(a.national_team_id as number, { matchTypeCategory: a.match_type_category as string | undefined, showAll: a.show_all as boolean | undefined }));
  read("get_national_team_matches", "Matches of national or U20 teams.", { league_office_type_id: z.number().int().optional() },
    (ht, a) => ht.getNationalTeamMatches((a.league_office_type_id as number) ?? 2));
  read("get_world_cup_groups", "World cup group standings for a season and round.",
    { cup_id: z.number().int(), season: z.number().int(), match_round: z.number().int() },
    (ht, a) => ht.getWorldCupGroups(a.cup_id as number, a.season as number, a.match_round as number));
  read("get_world_cup_matches", "World cup matches for a season and series unit.",
    { cup_id: z.number().int(), season: z.number().int(), cup_series_unit_id: z.number().int() },
    (ht, a) => ht.getWorldCupMatches(a.cup_id as number, a.season as number, a.cup_series_unit_id as number));

  // ===== alliances =====
  read("get_my_alliances", "Alliances (federations) you belong to.", {}, (ht) => ht.getMyAlliances());
  read("get_alliance", "Details of one alliance (federation).", { alliance_id: z.number().int().positive() },
    (ht, a) => ht.getAllianceDetails(a.alliance_id as number));
  read("get_alliance_members", "Members of an alliance.", { alliance_id: z.number().int().positive() },
    async (ht, a) => (await ht.getAllianceDetails(a.alliance_id as number)).members);
  read("get_alliance_roles", "Roles within an alliance.", { alliance_id: z.number().int().positive() },
    async (ht, a) => (await ht.getAllianceDetails(a.alliance_id as number)).roles);
  read("search_alliances", "Search alliances by name, abbreviation or description, or fetch one by id.",
    { by: z.enum(["name", "abbreviation", "description", "id"]).optional(), query: z.string().optional(), alliance_id: z.number().int().positive().optional(), language_id: z.number().int().optional(), page_index: z.number().int().nonnegative().optional() },
    (ht, a) => {
      const map: Record<string, number> = { name: 1, abbreviation: 2, description: 3, id: 4 };
      const type = map[(a.by as string) || "name"]!;
      const term = type === 4 ? String(a.alliance_id ?? "") : String(a.query ?? "");
      return ht.searchAlliances(type, term, (a.language_id as number) ?? 0, (a.page_index as number) ?? 0);
    });

  // ===== misc =====
  read("get_bookmarks", "Your bookmarks of a given type.", { bookmark_type: z.number().int().nonnegative().optional() },
    (ht, a) => ht.getBookmarks((a.bookmark_type as number) ?? 0));
  read("get_ladders", "Ladder challenges a team is in.", teamId,
    async (ht, a) => humanizeLadders(await (a.team_id ? ht.getLadders(a.team_id as number) : ht.getMyLadders())));
  read("get_ladder_details", "Standings of a ladder, optionally centred on a team or page.",
    { ladder_id: z.number().int().positive(), ...teamId, page_index: z.number().int().nonnegative().optional(), page_size: z.number().int().positive().optional() },
    async (ht, a) => humanizeLadderDetails(await ht.getLadderDetails(a.ladder_id as number, { teamId: a.team_id as number | undefined, pageIndex: a.page_index as number | undefined, pageSize: a.page_size as number | undefined })));
  const liveFlags = { source_system: SOURCE, include_starting_lineup: z.boolean().optional(), use_live_events_and_texts: z.boolean().optional() };
  read("get_live_matches", "Live match data for the matches on your live list.", liveFlags,
    (ht, a) => ht.getLiveMatches({ sourceSystem: a.source_system as string | undefined, includeStartingLineup: a.include_starting_lineup as boolean | undefined, useLiveEventsAndTexts: a.use_live_events_and_texts as boolean | undefined }));
  read("get_live_match", "Live match data for one match.", { match_id: z.number().int().positive(), ...liveFlags },
    (ht, a) => ht.getLiveMatches({ matchId: a.match_id as number, sourceSystem: a.source_system as string | undefined, includeStartingLineup: a.include_starting_lineup as boolean | undefined, useLiveEventsAndTexts: a.use_live_events_and_texts as boolean | undefined }));
  read("get_all_live_events", "All live events for the matches on your live list.", { include_starting_lineup: z.boolean().optional(), use_live_events_and_texts: z.boolean().optional() },
    (ht, a) => ht.getAllLiveEvents({ includeStartingLineup: a.include_starting_lineup as boolean | undefined, useLiveEventsAndTexts: a.use_live_events_and_texts as boolean | undefined }));
  read("get_new_live_events", "Live events since the given last-shown indexes.", { last_shown_indexes: z.string().optional(), include_starting_lineup: z.boolean().optional(), use_live_events_and_texts: z.boolean().optional() },
    (ht, a) => ht.getNewLiveEvents((a.last_shown_indexes as string) ?? "", { includeStartingLineup: a.include_starting_lineup as boolean | undefined, useLiveEventsAndTexts: a.use_live_events_and_texts as boolean | undefined }));
  read("search", "General Hattrick search for players, teams, managers, series, arenas, regions or matches.",
    { search_type: z.number().int().describe("0 players, 1 arenas, 2 managers, 3 series, 4 teams, 5 regions, 6 match"), query: z.string(), search_string2: z.string().optional(), search_id: z.number().int().optional(), search_league_id: z.number().int().optional(), page_index: z.number().int().nonnegative().optional() },
    (ht, a) => ht.search(a.search_type as number, a.query as string, { searchString2: a.search_string2 as string | undefined, searchId: a.search_id as number | undefined, searchLeagueId: a.search_league_id as number | undefined, pageIndex: a.page_index as number | undefined }));
  read("get_challenges", "Friendly challenges you have made and offers from others.", { weekend: z.boolean().optional() },
    (ht, a) => ht.getChallenges(a.weekend as boolean | undefined));
  read("is_challengeable", "Whether a team can be challenged to a friendly.", { team_id: z.number().int().positive(), weekend: z.boolean().optional() },
    async (ht, a) => (await ht.areChallengeable([a.team_id as number], a.weekend as boolean | undefined))[0]);
  read("are_challengeable", "Whether each of several teams can be challenged to a friendly.", { team_ids: z.array(z.number().int().positive()), weekend: z.boolean().optional() },
    (ht, a) => ht.areChallengeable(a.team_ids as number[], a.weekend as boolean | undefined));

  // ===== writes =====
  registerSetLineup(server, account, text);

  write("set_match_orders", "Set a match lineup from a raw CHPP matchorders lineup JSON (prefer set_lineup unless you already have the JSON).",
    { match_id: z.number().int().positive(), team_id: z.number().int().positive(), source_system: SOURCE, lineup: z.string() },
    (ht, a) => ht.setMatchOrders(a.match_id as number, a.team_id as number, a.lineup as string, (a.source_system as string) || "hattrick"));
  write("set_training", "Change the training type, intensity and stamina share of your team.",
    { team_id: z.number().int().positive(), training_type: z.number().int(), level: z.number().int().min(0).max(100), stamina_level: z.number().int().min(0).max(100) },
    (ht, a) => ht.setTraining(a.team_id as number, a.training_type as number, a.level as number, a.stamina_level as number));
  write("place_bid", "Place a bid on a transfer-listed player. Spends real in-game money and is irreversible. max_bid is a proxy ceiling, not a hard spend limit.",
    { player_id: z.number().int().positive(), team_id: z.number().int().positive(), bid: z.number().int().positive().describe("bid amount in SEK"), max_bid: z.number().int().positive().optional().describe("optional autobid ceiling in SEK") },
    (ht, a) => ht.placeBid(a.player_id as number, a.team_id as number, a.bid as number, (a.max_bid as number) ?? 0));
  write("ignore_transfer", "Stop tracking a transfer in one of your transfer lists.",
    { transfer_id: z.number().int().positive(), category: z.number().int().describe("tracking category: 5, 8 or 9") },
    async (ht, a) => { await ht.ignoreTransfer(a.transfer_id as number, a.category as number); return { status: "ignored" }; });
  write("delete_finished_bids", "Clear all finished transfers from your bids list.", {},
    async (ht) => { await ht.deleteAllFinishedBids(); return { status: "cleared" }; });
  write("set_youth_player_skills_visible", "Unlock (reveal) a youth player's hidden skill estimates.",
    { youth_player_id: z.number().int().positive(), ...youthShow },
    (ht, a) => ht.unlockYouthPlayerSkills(a.youth_player_id as number, { showScoutCall: a.show_scout_call as boolean | undefined, showLastMatch: a.show_last_match as boolean | undefined }));
  write("set_youth_team_skills_visible", "Unlock (reveal) hidden skill estimates for your whole youth team.",
    { youth_team_id: z.number().int().positive().optional(), ...youthShow },
    async (ht, a) => {
      const id = (a.youth_team_id as number | undefined) ?? (await ht.getMyYouthTeam()).id;
      return ht.unlockYouthTeamSkills(id, { showScoutCall: a.show_scout_call as boolean | undefined, showLastMatch: a.show_last_match as boolean | undefined });
    });
  write("challenge", "Arrange a friendly match against another team. match_place: 0 your arena, 1 their arena, 2 neutral.",
    { opponent_team: z.number().int().positive(), friendly_type: z.number().int(), match_place: z.number().int(), other_arena: z.number().int().positive().optional(), weekend: z.boolean().optional() },
    async (ht, a) => { await ht.challenge(a.opponent_team as number, a.friendly_type as number, a.match_place as number, { neutralArenaId: a.other_arena as number | undefined, weekend: a.weekend as boolean | undefined }); return { status: "challenged" }; });
  write("accept_challenge", "Accept a friendly challenge offered to you.", { friendly_match_id: z.number().int().positive() },
    async (ht, a) => { await ht.acceptChallenge(a.friendly_match_id as number); return { status: "accepted" }; });
  write("decline_challenge", "Decline a friendly challenge offered to you.", { friendly_match_id: z.number().int().positive() },
    async (ht, a) => { await ht.declineChallenge(a.friendly_match_id as number); return { status: "declined" }; });
  write("withdraw_challenge", "Withdraw a friendly challenge you arranged.", { friendly_match_id: z.number().int().positive() },
    async (ht, a) => { await ht.withdrawChallenge(a.friendly_match_id as number); return { status: "withdrawn" }; });
  write("add_live_match", "Add a match to your live-tracking list.", { match_id: z.number().int().positive(), ...liveFlags },
    (ht, a) => ht.addLiveMatch(a.match_id as number, { sourceSystem: a.source_system as string | undefined, includeStartingLineup: a.include_starting_lineup as boolean | undefined, useLiveEventsAndTexts: a.use_live_events_and_texts as boolean | undefined }));
  write("delete_live_match", "Remove a match from your live-tracking list.", { match_id: z.number().int().positive(), source_system: SOURCE },
    (ht, a) => ht.deleteLiveMatch(a.match_id as number, a.source_system as string | undefined));
  write("clear_live_matches", "Remove all matches from your live-tracking list.", {},
    async (ht) => { await ht.clearLiveMatches(); return { status: "cleared" }; });

  return server;
}

/** set_lineup is special: without confirm it previews via predictRatings; with
 *  confirm it saves via setMatchOrders. Both run (unlike the plain write gate). */
function registerSetLineup(
  server: McpServer,
  account: Account,
  text: (v: unknown) => { content: { type: "text"; text: string }[] },
): void {
  const positions = {
    goalkeeper: z.number().int().positive().optional(),
    right_back: z.number().int().positive().optional(),
    right_central_defender: z.number().int().positive().optional(),
    central_defender: z.number().int().positive().optional(),
    left_central_defender: z.number().int().positive().optional(),
    left_back: z.number().int().positive().optional(),
    right_winger: z.number().int().positive().optional(),
    right_inner_mid: z.number().int().positive().optional(),
    central_inner_mid: z.number().int().positive().optional(),
    left_inner_mid: z.number().int().positive().optional(),
    left_winger: z.number().int().positive().optional(),
    right_forward: z.number().int().positive().optional(),
    central_forward: z.number().int().positive().optional(),
    left_forward: z.number().int().positive().optional(),
  };
  const bench = {
    bench_goalkeeper: z.number().int().positive().optional(),
    bench_central_defender: z.number().int().positive().optional(),
    bench_wing_back: z.number().int().positive().optional(),
    bench_inner_mid: z.number().int().positive().optional(),
    bench_forward: z.number().int().positive().optional(),
    bench_winger: z.number().int().positive().optional(),
    bench_extra: z.number().int().positive().optional(),
    backup_goalkeeper: z.number().int().positive().optional(),
    backup_central_defender: z.number().int().positive().optional(),
    backup_wing_back: z.number().int().positive().optional(),
    backup_inner_mid: z.number().int().positive().optional(),
    backup_forward: z.number().int().positive().optional(),
    backup_winger: z.number().int().positive().optional(),
    backup_extra: z.number().int().positive().optional(),
  };
  const sub = z.object({
    player_in: z.number().int().positive(),
    player_out: z.number().int().positive().optional(),
    order_type: z.number().int().optional(),
    minute: z.number().int().optional(),
    position: z.number().int().optional(),
    behaviour: z.number().int().optional(),
    card: z.number().int().optional(),
    standing: z.number().int().optional(),
  });

  server.registerTool(
    "set_lineup",
    {
      description:
        'Set the match lineup from player IDs per position. Without "confirm": true it previews the predicted ratings without saving; with it, it saves the orders.',
      inputSchema: {
        match_id: z.number().int().positive(),
        team_id: z.number().int().positive(),
        source_system: z.enum(["hattrick", "youth", "htointegrated"]).optional(),
        ...positions,
        behaviours: z.record(z.string(), z.number().int()).optional(),
        ...bench,
        captain: z.number().int().positive().optional(),
        set_pieces_taker: z.number().int().positive().optional(),
        penalty_takers: z.array(z.number().int().positive()).optional(),
        tactic: z.number().int().optional(),
        attitude: z.number().int().optional(),
        coach_modifier: z.number().int().optional(),
        man_marker: z.number().int().positive().optional(),
        man_marking: z.number().int().positive().optional(),
        substitutions: z.array(sub).optional(),
        confirm: z.boolean().optional(),
      },
      annotations: { destructiveHint: true },
    },
    (async (a: Record<string, unknown>) => {
      const ht = account.client();
      const lineup = buildLineup(a as unknown as SetLineupInput);
      const matchId = a.match_id as number;
      const teamId = a.team_id as number;
      const src = (a.source_system as string) || "hattrick";
      const result = await friendly(() =>
        a.confirm
          ? ht.setMatchOrders(matchId, teamId, lineup, src)
          : ht.predictRatings(matchId, teamId, lineup, src),
      );
      return text({ saved: !!a.confirm, result });
    }) as never,
  );
}
