import { buildBaseString, hmacSha1Base64, percentEncode, randomNonce } from "./oauth.js";
import { CHPP_OAUTH_BASE, type FetchLike } from "./transport.js";

/** A stored CHPP access token (what you persist after authorizing). */
export interface AccessToken {
  accessToken: string;
  accessSecret: string;
}

/** A temporary request token plus the URL the user must visit to authorize. */
export interface RequestToken {
  requestToken: string;
  requestSecret: string;
  authorizeUrl: string;
}

async function oauthHeader(
  method: string,
  url: string,
  consumerSecret: string,
  tokenSecret: string,
  params: Record<string, string>,
): Promise<string> {
  const u = new URL(url);
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;
  const all: Record<string, string> = { ...params };
  for (const [k, v] of u.searchParams.entries()) all[k] = v;

  const baseString = buildBaseString(method, baseUrl, all);
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = await hmacSha1Base64(key, baseString);

  const signed = { ...params, oauth_signature: signature };
  return (
    "OAuth " +
    Object.entries(signed)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .sort()
      .join(", ")
  );
}

function baseOauthParams(consumerKey: string): Record<string, string> {
  return {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomNonce(),
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
}

function parseForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [k, v] = pair.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

/**
 * Step 1 of the OAuth 1.0a out-of-band flow: get a request token and the URL
 * the user opens to grant access (returning a verification PIN).
 */
export async function getRequestToken(
  consumerKey: string,
  consumerSecret: string,
  /** Callback URL the user is redirected back to, or "oob" for the PIN flow. */
  callback: string = "oob",
  fetchImpl: FetchLike = globalThis.fetch.bind(globalThis) as unknown as FetchLike,
): Promise<RequestToken> {
  const url = `${CHPP_OAUTH_BASE}request_token.ashx`;
  const params = { ...baseOauthParams(consumerKey), oauth_callback: callback };
  const header = await oauthHeader("GET", url, consumerSecret, "", params);
  const res = await fetchImpl(url, { method: "GET", headers: { Authorization: header } });
  const form = parseForm(await res.text());
  const requestToken = form["oauth_token"] ?? "";
  const requestSecret = form["oauth_token_secret"] ?? "";
  return {
    requestToken,
    requestSecret,
    authorizeUrl: `${CHPP_OAUTH_BASE}authorize.aspx?oauth_token=${percentEncode(requestToken)}`,
  };
}

/**
 * Step 2 of the OAuth 1.0a out-of-band flow: exchange the authorized request
 * token plus the user's verification PIN for a durable access token.
 */
export async function getAccessToken(
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestSecret: string,
  verifier: string,
  fetchImpl: FetchLike = globalThis.fetch.bind(globalThis) as unknown as FetchLike,
): Promise<AccessToken> {
  const url = `${CHPP_OAUTH_BASE}access_token.ashx`;
  const params = {
    ...baseOauthParams(consumerKey),
    oauth_token: requestToken,
    oauth_verifier: verifier,
  };
  const header = await oauthHeader("GET", url, consumerSecret, requestSecret, params);
  const res = await fetchImpl(url, { method: "GET", headers: { Authorization: header } });
  const form = parseForm(await res.text());
  return {
    accessToken: form["oauth_token"] ?? "",
    accessSecret: form["oauth_token_secret"] ?? "",
  };
}
