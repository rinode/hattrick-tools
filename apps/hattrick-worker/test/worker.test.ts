import { describe, expect, it } from "vitest";
import app, { type Env } from "../src/index.js";
import { seal, unseal } from "../src/session.js";

const env: Env = {
  HATTRICK_CONSUMER_KEY: "ck",
  HATTRICK_CONSUMER_SECRET: "cs",
  SESSION_SECRET: "test-session-secret-which-is-long-enough",
};

describe("session seal/unseal (AES-GCM, Web Crypto)", () => {
  it("round-trips a value and rejects tampering", async () => {
    const sealed = await seal(env.SESSION_SECRET, { accessToken: "at", accessSecret: "as" });
    expect(sealed).toContain(".");
    const back = await unseal<{ accessToken: string }>(env.SESSION_SECRET, sealed);
    expect(back?.accessToken).toBe("at");
    // Wrong secret → null, not a throw.
    expect(await unseal("other-secret", sealed)).toBeNull();
    expect(await unseal(env.SESSION_SECRET, "garbage")).toBeNull();
  });
});

describe("worker /team-photo/api", () => {
  it("reports not connected without a session cookie", async () => {
    const res = await app.request("/team-photo/api/auth/status", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("reports connected with a valid session cookie", async () => {
    const cookie = await seal(env.SESSION_SECRET, { accessToken: "at", accessSecret: "as" });
    const res = await app.request(
      "/team-photo/api/auth/status",
      { headers: { Cookie: `ht_sess=${cookie}` } },
      env,
    );
    expect(await res.json()).toEqual({ connected: true });
  });

  it("401s on /team-photo/api/squad without a session", async () => {
    const res = await app.request("/team-photo/api/squad", {}, env);
    expect(res.status).toBe(401);
  });

  it("login redirects to Hattrick's authorize URL", async () => {
    // getRequestToken calls CHPP; stub global fetch to return a request token.
    const orig = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("oauth_token=reqtok&oauth_token_secret=reqsec")) as typeof fetch;
    try {
      const res = await app.request("/team-photo/api/auth/login", {}, env);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("authorize.aspx?oauth_token=reqtok");
      expect(res.headers.get("set-cookie")).toContain("ht_req=");
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe("worker routing", () => {
  it("redirects bare app roots to a trailing slash", async () => {
    const tp = await app.request("/team-photo", {}, env);
    expect(tp.status).toBe(302);
    expect(tp.headers.get("location")).toBe("/team-photo/");
    const pr = await app.request("/player-renderer", {}, env);
    expect(pr.status).toBe(302);
    expect(pr.headers.get("location")).toBe("/player-renderer/");
  });

  it("serves no assets binding in tests (falls through to 404)", async () => {
    const res = await app.request("/player-renderer/", {}, env);
    expect(res.status).toBe(404);
  });
});
