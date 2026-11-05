import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  HattrickClient,
  getAccessToken,
  getRequestToken,
  type AccessToken,
} from "hattrick-chpp";
import { seal, unseal } from "./session.js";

export interface Env {
  HATTRICK_CONSUMER_KEY: string;
  HATTRICK_CONSUMER_SECRET: string;
  SESSION_SECRET: string;
  /**
   * Static-assets binding: a combined build root holding both apps,
   *   public/team-photo/…  and  public/player-renderer/…
   * served at matching URLs. Absent in unit tests.
   */
  ASSETS?: { fetch(req: Request): Promise<Response> };
}

const SESS = "ht_sess"; // sealed { accessToken, accessSecret }
const REQ = "ht_req"; // sealed { requestToken, requestSecret } (login→callback)

// team-photo is served under this path and owns /team-photo/api/*. Its cookies
// and OAuth callback are scoped here. player-renderer is a static app under
// /player-renderer with no backend. Asset URLs already match the build layout,
// so the catch-all serves them straight from ASSETS (no path rewriting).
const BASE = "/team-photo";
const cookieBase = { httpOnly: true, secure: true, sameSite: "Lax", path: BASE } as const;

export const app = new Hono<{ Bindings: Env }>();

// Bare app roots → trailing slash so relative asset URLs resolve.
app.get(BASE, (c) => c.redirect(`${BASE}/`));
app.get("/player-renderer", (c) => c.redirect("/player-renderer/"));

/** Whether the caller already has a CHPP token. */
app.get(`${BASE}/api/auth/status`, async (c) => {
  const sess = await unseal<AccessToken>(c.env.SESSION_SECRET, getCookie(c, SESS));
  return c.json({ connected: Boolean(sess?.accessToken) });
});

/** Step 1: get a request token and send the user to Hattrick to authorize. */
app.get(`${BASE}/api/auth/login`, async (c) => {
  const callback = new URL(`${BASE}/api/auth/callback`, c.req.url).toString();
  const rt = await getRequestToken(
    c.env.HATTRICK_CONSUMER_KEY,
    c.env.HATTRICK_CONSUMER_SECRET,
    callback,
  );
  setCookie(c, REQ, await seal(c.env.SESSION_SECRET, rt), { ...cookieBase, maxAge: 600 });
  return c.redirect(rt.authorizeUrl);
});

/** Step 2: exchange the authorized request token + verifier for an access token. */
app.get(`${BASE}/api/auth/callback`, async (c) => {
  const verifier = c.req.query("oauth_verifier");
  const req = await unseal<{ requestToken: string; requestSecret: string }>(
    c.env.SESSION_SECRET,
    getCookie(c, REQ),
  );
  if (!verifier || !req)
    return c.text("Authorization failed or expired. Try connecting again.", 400);

  const token = await getAccessToken(
    c.env.HATTRICK_CONSUMER_KEY,
    c.env.HATTRICK_CONSUMER_SECRET,
    req.requestToken,
    req.requestSecret,
    verifier,
  );
  deleteCookie(c, REQ, { path: BASE });
  if (!token.accessToken) return c.text("Could not obtain access token.", 502);
  setCookie(c, SESS, await seal(c.env.SESSION_SECRET, token), {
    ...cookieBase,
    maxAge: 60 * 60 * 24 * 30,
  });
  return c.redirect(`${BASE}/`);
});

app.post(`${BASE}/api/auth/logout`, (c) => {
  deleteCookie(c, SESS, { path: BASE });
  return c.json({ ok: true });
});

function clientFor(c: { env: Env }, sess: AccessToken): HattrickClient {
  return new HattrickClient({
    consumerKey: c.env.HATTRICK_CONSUMER_KEY,
    consumerSecret: c.env.HATTRICK_CONSUMER_SECRET,
    accessToken: sess.accessToken,
    accessSecret: sess.accessSecret,
  });
}

/** The signed-in user's teams (a Supporter may own several). */
app.get(`${BASE}/api/teams`, async (c) => {
  const sess = await unseal<AccessToken>(c.env.SESSION_SECRET, getCookie(c, SESS));
  if (!sess?.accessToken) return c.json({ error: "not connected" }, 401);
  try {
    const details = await clientFor(c, sess).getMyTeamDetails();
    return c.json({
      teams: details.teams.map((t) => ({ id: t.id, name: t.name, primary: t.isPrimaryClub })),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

/** A squad: roster + gender joined with avatar layers. Defaults to the primary
 *  team; pass ?teamId= to pick another of the user's teams. */
app.get(`${BASE}/api/squad`, async (c) => {
  const sess = await unseal<AccessToken>(c.env.SESSION_SECRET, getCookie(c, SESS));
  if (!sess?.accessToken) return c.json({ error: "not connected" }, 401);

  const client = clientFor(c, sess);
  const teamId = Number(c.req.query("teamId")) || 0;
  try {
    const [team, avatars] = await Promise.all([
      teamId ? client.getPlayers(teamId) : client.getMyPlayers(),
      teamId ? client.getAvatars(teamId) : client.getMyAvatars(),
    ]);
    const byId = new Map(avatars.map((a) => [a.playerId, a.avatar]));
    return c.json({
      teamId: team.teamId,
      teamName: team.teamName,
      players: team.players.map((p) => ({
        id: p.id,
        name: [p.firstName, p.nickName, p.lastName].filter(Boolean).join(" "),
        number: p.number,
        gender: p.gender,
        avatar: byId.get(p.id) ?? null,
      })),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

// Same-origin proxy for Hattrick avatar assets. The team-photo render draws the
// player's face parts and reads their kit data; serving them from this origin
// keeps the export canvas untainted and avoids vendoring per-player PNGs. Only
// these two upstream origins and prefixes are proxied (not an open proxy).
async function proxyAsset(upstream: string): Promise<Response> {
  // Identify the client honestly. Some CDNs 403 a fetch with no User-Agent.
  const r = await fetch(upstream, {
    headers: { "User-Agent": "hattrick-tools (+https://hattrick-tools.org)" },
    cf: { cacheTtl: 86400, cacheEverything: true },
  } as RequestInit);
  if (!r.ok) return new Response(`upstream asset error ${r.status}`, { status: r.status });
  const headers = new Headers();
  const ct = r.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(r.body, { status: 200, headers });
}

// Face parts etc.: /team-photo/Img/Avatar/… → www.hattrick.org/Img/Avatar/…
app.get(`${BASE}/Img/Avatar/*`, (c) => {
  const path = new URL(c.req.url).pathname.slice(BASE.length); // "/Img/Avatar/…"
  return proxyAsset(`https://www.hattrick.org${path}`);
});
// Kit data: /team-photo/_kit/… → res.hattrick.org/…
app.get(`${BASE}/_kit/*`, (c) => {
  const path = new URL(c.req.url).pathname.slice(`${BASE}/_kit`.length); // "/kits/…"
  return proxyAsset(`https://res.hattrick.org${path}`);
});

// Everything else: serve the static builds from the ASSETS binding. The build
// layout mirrors the URL paths (public/team-photo/…, public/player-renderer/…),
// so requests map straight to files.
app.all("*", async (c) => {
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.notFound();
});

export default app;
