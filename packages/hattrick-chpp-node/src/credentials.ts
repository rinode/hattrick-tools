import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { getAccessToken, getRequestToken } from "./auth.js";
import type { OAuthCredentials } from "./oauth.js";

// Node-only helpers (filesystem + stdin). Not exported from the package index,
// so browser bundles never pull in node:fs — import via "hattrick-chpp-node/node".

const DEFAULT_CREDENTIALS = "credentials.json";

interface CredentialsFile {
  access_token?: string;
  access_secret?: string;
}

function credentialsPath(env: NodeJS.ProcessEnv): string {
  return env.HATTRICK_CREDENTIALS || DEFAULT_CREDENTIALS;
}

/**
 * Consumer key/secret come from the environment (the app's identity). The
 * access token/secret come from the environment if set, else from a cached
 * credentials.json written by the login flow (same shape the Go client uses).
 */
export function loadCredentials(env: NodeJS.ProcessEnv = process.env): OAuthCredentials {
  const consumerKey = env.HATTRICK_CONSUMER_KEY;
  const consumerSecret = env.HATTRICK_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("set HATTRICK_CONSUMER_KEY and HATTRICK_CONSUMER_SECRET");
  }

  let accessToken = env.HATTRICK_ACCESS_TOKEN;
  let accessSecret = env.HATTRICK_ACCESS_SECRET;

  if (!accessToken || !accessSecret) {
    try {
      const file = JSON.parse(readFileSync(credentialsPath(env), "utf8")) as CredentialsFile;
      accessToken = accessToken ?? file.access_token;
      accessSecret = accessSecret ?? file.access_secret;
    } catch {
      // no cached credentials yet — fall through to the error below
    }
  }

  if (!accessToken || !accessSecret) {
    throw new Error(
      "no access token — run the login flow (`hattrick-login`, or the app's `login` " +
        "script) to authorize, or set HATTRICK_ACCESS_TOKEN / HATTRICK_ACCESS_SECRET",
    );
  }

  return { consumerKey, consumerSecret, accessToken, accessSecret };
}

/**
 * Interactive OAuth 1.0a out-of-band login: prints the authorize URL, reads the
 * verification PIN from stdin, exchanges it for a durable access token and
 * writes it to credentials.json (HATTRICK_CREDENTIALS, or ./credentials.json).
 * Returns the path written. Needs only the consumer key/secret in the env.
 */
export async function runLogin(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const consumerKey = env.HATTRICK_CONSUMER_KEY;
  const consumerSecret = env.HATTRICK_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error("set HATTRICK_CONSUMER_KEY and HATTRICK_CONSUMER_SECRET first");
  }

  const req = await getRequestToken(consumerKey, consumerSecret);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write(`\nAuthorize this app in your browser:\n  ${req.authorizeUrl}\n\n`);
    const verifier = (await rl.question("Paste the verification code (PIN): ")).trim();
    if (!verifier) throw new Error("no verification code entered");

    const token = await getAccessToken(
      consumerKey,
      consumerSecret,
      req.requestToken,
      req.requestSecret,
      verifier,
    );
    if (!token.accessToken || !token.accessSecret) {
      throw new Error("login failed: no access token returned (wrong PIN?)");
    }

    const path = credentialsPath(env);
    writeFileSync(
      path,
      JSON.stringify(
        { access_token: token.accessToken, access_secret: token.accessSecret },
        null,
        2,
      ) + "\n",
    );
    return path;
  } finally {
    rl.close();
  }
}
