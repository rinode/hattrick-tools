import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HattrickClient, type FetchLike, type OAuthCredentials } from "hattrick-chpp-node";
import { TtlCache } from "./cache.js";
import {
  humanizeAvatars,
  humanizeEconomy,
  humanizeTeamPlayers,
  humanizeTraining,
} from "./humanize.js";

export const INSTRUCTIONS = `Read-only access to the authorised manager's Hattrick.org data via CHPP.
Omit a team_id argument to get the manager's own primary team.
Fields that are zero, false or empty are left out of results.
Skill values read "name (n)" on the 0 (non-existent) to 20 (divine) scale.
Money is shown in EUR (the CHPP API reports SEK; 10 SEK = 1 EUR).`;

export interface ServerOptions {
  fetchImpl?: FetchLike;
  ttlMs?: number;
  version?: string;
}

/** Builds the Hattrick MCP server with its read tools over hattrick-chpp-node. */
export function buildServer(creds: OAuthCredentials, opts: ServerOptions = {}): McpServer {
  const client = new HattrickClient(creds, opts.fetchImpl);
  const cache = new TtlCache(opts.ttlMs ?? 5 * 60 * 1000);
  const server = new McpServer(
    { name: "hattrick-mcp", version: opts.version ?? "0.0.0" },
    { instructions: INSTRUCTIONS },
  );

  const text = (value: unknown) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  });
  const teamId = { team_id: z.number().int().positive().optional() };

  server.registerTool(
    "get_team",
    {
      description: "Team details: the owning manager and their team name(s).",
      inputSchema: teamId,
    },
    async ({ team_id }) => {
      const td = await cache.get(`team:${team_id ?? "me"}`, () =>
        team_id ? client.getTeamDetails(team_id) : client.getMyTeamDetails(),
      );
      return text(td);
    },
  );

  server.registerTool(
    "get_players",
    {
      description:
        "Senior squad with age, form, skills, TSI, salary (EUR), specialty, injuries and cards.",
      inputSchema: teamId,
    },
    async ({ team_id }) => {
      const tp = await cache.get(`players:${team_id ?? "me"}`, () =>
        team_id ? client.getPlayers(team_id) : client.getMyPlayers(),
      );
      return text(humanizeTeamPlayers(tp));
    },
  );

  server.registerTool(
    "get_economy",
    {
      description: "Club finances in EUR: cash, this week's and last week's income and costs.",
      inputSchema: teamId,
    },
    async ({ team_id }) => {
      const eco = await cache.get(`economy:${team_id ?? "me"}`, () =>
        team_id ? client.getEconomy(team_id) : client.getMyEconomy(),
      );
      return text(humanizeEconomy(eco));
    },
  );

  server.registerTool(
    "get_training",
    {
      description: "Training type, intensity, stamina share, trainer and special-training players.",
      inputSchema: teamId,
    },
    async ({ team_id }) => {
      const tr = await cache.get(`training:${team_id ?? "me"}`, () =>
        team_id ? client.getTraining(team_id) : client.getMyTraining(),
      );
      return text(humanizeTraining(tr));
    },
  );

  server.registerTool(
    "get_avatars",
    {
      description: "Layered avatar recipes (background + positioned part layers) for a team.",
      inputSchema: {
        ...teamId,
        kind: z.enum(["players", "hof"]).optional(),
      },
    },
    async ({ team_id, kind }) => {
      const avatars = await cache.get(`avatars:${team_id ?? "me"}:${kind ?? "players"}`, () =>
        team_id ? client.getAvatars(team_id, kind) : client.getMyAvatars(kind),
      );
      return text(humanizeAvatars(avatars));
    },
  );

  return server;
}
