# hattrick-tools

A pnpm + turborepo monorepo of [Hattrick](https://www.hattrick.org) CHPP tooling, in TypeScript.

| Package                             | What it is                                                                                                                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/hattrick-core`            | Shared domain helpers: skill denominations, specialties, EUR money (the CHPP API reports SEK; 10 SEK = €1).                                                                                                                                              |
| `packages/hattrick-chpp-node`       | A typed CHPP API client — OAuth 1.0a signing, XML decode, and endpoints. Ported from [lucianoq/hattrick](https://github.com/lucianoq/hattrick).                                                                                                          |
| `packages/hattrick-player-renderer` | Renders a Hattrick full-body figure. The **rendering** is standalone (drives Hattrick's `slimkitrender` against vendored assets — no Hattrick at runtime); the **input provision** (a player page's `init(...)` args) is the only Hattrick-coupled part. |
| `apps/hattrick-mcp`                 | An MCP server exposing read-only CHPP data to AI assistants (Node port of the Go `hattrick-mcp`).                                                                                                                                                        |
| `apps/renderer-studio`              | A standalone test UI: design a player (body, skin, size, parts) and export the figure as PNG. No backend.                                                                                                                                                |
| `apps/hattrick-team-photo`          | Pulls your roster from CHPP, renders each figure, and arranges them into staggered rows you can export.                                                                                                                                                  |

## Setup

```sh
pnpm install
pnpm build
pnpm test        # 46 tests
```

Credentials (reuse your existing CHPP app's consumer key/secret; the access token comes from a one-time login):

```sh
cp .env.example .env   # then fill it in
```

## The renderer and its assets

The full-body renderer needs Hattrick's engine + the 12 body SVG/mesh/shape sets. They're text, committed to this (private) repo under `packages/hattrick-player-renderer/vendor`, populated by:

```sh
pnpm --filter hattrick-player-renderer fetch-assets   # run from a machine with internet
```

Per-player face PNGs and kit data stay dynamic — they come from the input-provision step, not the vendored set.

> Note: the vendored engine and artwork are Hattrick's. Fine for a private tool; clear it with Hattrick before publishing anything that redistributes them.

## Apps

**MCP server** — `pnpm --filter hattrick-mcp build`, then `node apps/hattrick-mcp/dist/cli.js serve` (stdio) or `… http` (remote, needs `HATTRICK_MCP_TOKEN`). Tools: `get_team`, `get_players`, `get_economy`, `get_training`, `get_avatars`, `get_matches`, `get_ladders`, `get_ladder_details`, `search_transfers`. Money is shown in EUR; skills as `name (n)`.

**Renderer studio** — `pnpm --filter renderer-studio dev`, then design + export. Fully standalone (serves the vendored assets).

**Team photo** — set the env (and `HATTRICK_COOKIE` for the player-page proxy, since player pages need a logged-in web session), then `pnpm --filter hattrick-team-photo dev`.

## Status

Endpoint coverage in `hattrick-chpp-node` is being expanded (currently avatars, players, teamdetails, economy, training, matches, ladderlist, ladderdetails, transfersearch). The browser render paths (studio, team-photo) are typed and built here but are exercised in a real browser against live assets.
