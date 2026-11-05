# hattrick-tools

A pnpm + turborepo monorepo of [Hattrick](https://www.hattrick.org) CHPP tooling, in TypeScript.

| Package                             | What it is                                                                                                                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/hattrick-core`            | Shared domain helpers: skill denominations, specialties, EUR money (the CHPP API reports SEK; 10 SEK = €1).                                                                                                                                              |
| `packages/hattrick-chpp`       | A typed CHPP API client — OAuth 1.0a signing, XML decode, and endpoints. Ported from [lucianoq/hattrick](https://github.com/lucianoq/hattrick).                                                                                                          |
| `packages/hattrick-player-renderer` | Renders a Hattrick full-body figure. The **rendering** is standalone (drives Hattrick's `slimkitrender` against vendored assets — no Hattrick at runtime); the **input provision** (a player page's `init(...)` args) is the only Hattrick-coupled part. |
| `apps/hattrick-mcp`                 | An MCP server exposing the full CHPP tool set (reads + confirm-gated writes) to AI assistants (Node port of the Go `hattrick-mcp`).                                                                                                                      |
| `apps/renderer-studio`              | A standalone test UI: design a player (body, skin, size, parts) and export the figure as PNG. No backend.                                                                                                                                                |
| `apps/hattrick-team-photo`          | Pulls your roster from CHPP, renders each figure, and arranges them into staggered rows you can export.                                                                                                                                                  |

## Setup

```sh
pnpm install
pnpm build
pnpm test        # 70 tests
```

Credentials — set only the CHPP app's consumer key/secret, then authorize once; the access token is fetched via the OAuth login and cached to `credentials.json` (git-ignored):

```sh
cp .env.example .env                       # fill in HATTRICK_CONSUMER_KEY / _SECRET
pnpm --filter hattrick-mcp login           # prints an authorize URL, paste back the PIN
# (or, equivalently: pnpm --filter hattrick-team-photo login / npx hattrick-login)
```

Both apps read that cached token, so you never paste the access token by hand. (You still can: set `HATTRICK_ACCESS_TOKEN` / `HATTRICK_ACCESS_SECRET` to override, e.g. to reuse the Go client's token.)

## The renderer and its assets

The full-body renderer needs Hattrick's engine + the 12 body SVG/mesh/shape sets. They're text, committed to this (private) repo under `packages/hattrick-player-renderer/vendor`, populated by:

```sh
pnpm --filter hattrick-player-renderer fetch-assets   # run from a machine with internet
```

Per-player face PNGs and kit data stay dynamic — they come from the input-provision step, not the vendored set.

> Note: the vendored engine and artwork are Hattrick's. Fine for a private tool; clear it with Hattrick before publishing anything that redistributes them.

## Apps

**MCP server** — `node apps/hattrick-mcp/dist/cli.js serve` (stdio), `… http` (remote, needs `HATTRICK_MCP_TOKEN`), or `… login` (interactive OAuth that writes the access token). Exposes the full CHPP tool set — 93 tools: every documented read endpoint (team, players, matches, youth, national teams, tournaments, alliances, live, transfers, world/translations, …) plus confirm-gated writes (`set_lineup`/`set_match_orders`, `place_bid`, `set_training`, challenges, live-match admin, youth skill unlocks) and in-session `login`/`complete_login`. Money is shown in EUR; skills as `name (n)`. Writes require `confirm: true` or they only preview.

**Renderer studio** — `pnpm --filter renderer-studio dev`, then design + export. Fully standalone (serves the vendored assets).

**Team photo** — after login, `pnpm --filter hattrick-team-photo dev`. The roster comes from CHPP; each player's figure is rendered from their (public) player page via a dev-server proxy. `HATTRICK_COOKIE` is optional — only a fallback against anti-scrape throttling on bulk fetches.

## Status

`hattrick-chpp` is at full parity with the Go lib — all 57 CHPP files, read and write (set match orders & predict ratings, place/ignore bids, unlock youth skills, live add/delete, challenge create/accept/decline). See `packages/hattrick-chpp/API_COVERAGE.md`. The browser render paths (studio, team-photo) are typed and built here but are exercised in a real browser against live assets.
