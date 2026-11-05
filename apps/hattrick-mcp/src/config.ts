import { readFileSync } from "node:fs";
import { Account } from "./account.js";

// Credential loading is shared across the Node tooling. Consumer key/secret
// come from the environment; the access token comes from the login flow's
// cached credentials.json (or HATTRICK_ACCESS_TOKEN / HATTRICK_ACCESS_SECRET).
export { loadCredentials } from "hattrick-chpp-node/node";

/**
 * Builds an Account from the environment. Only the consumer key/secret are
 * required; the access token is optional so the server can start logged-out
 * and the manager can authorise in-session via the login/complete_login tools.
 */
export function loadAccount(env: NodeJS.ProcessEnv = process.env): Account {
  const consumerKey = env.HATTRICK_CONSUMER_KEY;
  const consumerSecret = env.HATTRICK_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("set HATTRICK_CONSUMER_KEY and HATTRICK_CONSUMER_SECRET");
  }

  const credentialsPath = env.HATTRICK_CREDENTIALS || "credentials.json";
  let accessToken = env.HATTRICK_ACCESS_TOKEN;
  let accessSecret = env.HATTRICK_ACCESS_SECRET;
  if (!accessToken || !accessSecret) {
    try {
      const file = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
        access_token?: string;
        access_secret?: string;
      };
      accessToken = accessToken ?? file.access_token;
      accessSecret = accessSecret ?? file.access_secret;
    } catch {
      // no cached token yet — the manager logs in via the tools
    }
  }

  const token =
    accessToken && accessSecret ? { accessToken, accessSecret } : undefined;
  return new Account(consumerKey, consumerSecret, { token, credentialsPath });
}
