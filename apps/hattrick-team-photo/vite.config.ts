import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";
import { HattrickClient, type OAuthCredentials } from "hattrick-chpp-node";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const vendorDir = fileURLToPath(
  new URL("../../packages/hattrick-player-renderer/vendor", import.meta.url),
);

function credsFromEnv(): OAuthCredentials {
  const {
    HATTRICK_CONSUMER_KEY,
    HATTRICK_CONSUMER_SECRET,
    HATTRICK_ACCESS_TOKEN,
    HATTRICK_ACCESS_SECRET,
  } = process.env;
  if (
    !HATTRICK_CONSUMER_KEY ||
    !HATTRICK_CONSUMER_SECRET ||
    !HATTRICK_ACCESS_TOKEN ||
    !HATTRICK_ACCESS_SECRET
  ) {
    throw new Error(
      "set HATTRICK_CONSUMER_KEY/SECRET and HATTRICK_ACCESS_TOKEN/SECRET in the environment",
    );
  }
  return {
    consumerKey: HATTRICK_CONSUMER_KEY,
    consumerSecret: HATTRICK_CONSUMER_SECRET,
    accessToken: HATTRICK_ACCESS_TOKEN,
    accessSecret: HATTRICK_ACCESS_SECRET,
  };
}

const send = (res: Parameters<Connect.NextHandleFunction>[1], status: number, body: string) => {
  res.statusCode = status;
  res.end(body);
};

/**
 * Dev-server API: the roster (CHPP) and a player-page proxy (so the browser's
 * renderByPlayerId clears CORS). The page fetch forwards HATTRICK_COOKIE if
 * set, since player pages require a logged-in Hattrick web session.
 */
function apiPlugin(): Plugin {
  return {
    name: "team-photo-api",
    configureServer(server) {
      server.middlewares.use("/api/roster", async (_req, res) => {
        try {
          const team = await new HattrickClient(credsFromEnv()).getMyPlayers();
          res.setHeader("Content-Type", "application/json");
          send(
            res,
            200,
            JSON.stringify({
              teamId: team.teamId,
              teamName: team.teamName,
              players: team.players.map((p) => ({
                id: p.id,
                name: [p.firstName, p.nickName, p.lastName].filter(Boolean).join(" "),
                number: p.number,
              })),
            }),
          );
        } catch (err) {
          send(res, 500, String(err instanceof Error ? err.message : err));
        }
      });

      server.middlewares.use("/api/player-page", async (req, res) => {
        const id = new URL(req.url ?? "", "http://x").searchParams.get("id");
        if (!id) return send(res, 400, "missing id");
        try {
          const page = await fetch(
            `https://www.hattrick.org/en/Club/Players/Player.aspx?playerId=${encodeURIComponent(id)}`,
            process.env.HATTRICK_COOKIE
              ? { headers: { Cookie: process.env.HATTRICK_COOKIE } }
              : undefined,
          );
          res.setHeader("Content-Type", "text/html");
          send(res, 200, await page.text());
        } catch (err) {
          send(res, 502, String(err instanceof Error ? err.message : err));
        }
      });
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: vendorDir,
  plugins: [apiPlugin()],
  server: { fs: { allow: [repoRoot] } },
});
