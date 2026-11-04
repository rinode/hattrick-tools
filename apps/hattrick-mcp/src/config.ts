import { readFileSync } from "node:fs";
import type { OAuthCredentials } from "hattrick-chpp-node";

/**
 * Loads CHPP credentials from the environment, reusing the same consumer
 * key/secret as the Go hattrick-mcp. The access token/secret come from
 * HATTRICK_ACCESS_TOKEN / HATTRICK_ACCESS_SECRET, or from a credentials JSON
 * file named by HATTRICK_CREDENTIALS ({ "access_token", "access_secret" } —
 * the same file the Go client writes on login).
 */
export function loadCredentials(env: NodeJS.ProcessEnv = process.env): OAuthCredentials {
  const consumerKey = env.HATTRICK_CONSUMER_KEY;
  const consumerSecret = env.HATTRICK_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("set HATTRICK_CONSUMER_KEY and HATTRICK_CONSUMER_SECRET");
  }

  let accessToken = env.HATTRICK_ACCESS_TOKEN;
  let accessSecret = env.HATTRICK_ACCESS_SECRET;

  if ((!accessToken || !accessSecret) && env.HATTRICK_CREDENTIALS) {
    const file = JSON.parse(readFileSync(env.HATTRICK_CREDENTIALS, "utf8")) as {
      access_token?: string;
      access_secret?: string;
    };
    accessToken = accessToken ?? file.access_token;
    accessSecret = accessSecret ?? file.access_secret;
  }

  if (!accessToken || !accessSecret) {
    throw new Error(
      "no access token: set HATTRICK_ACCESS_TOKEN and HATTRICK_ACCESS_SECRET, or point " +
        "HATTRICK_CREDENTIALS at a credentials.json (run the CHPP login flow first)",
    );
  }

  return { consumerKey, consumerSecret, accessToken, accessSecret };
}
