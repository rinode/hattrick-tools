import { createHmac, randomBytes } from "node:crypto";

/** OAuth 1.0a consumer + access credentials for a signed CHPP request. */
export interface OAuthCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Percent-encodes per RFC 5849 (OAuth): the unreserved characters
 * `A-Z a-z 0-9 - . _ ~` are left as-is, everything else becomes %XX
 * (uppercase hex). This is a faithful port of the Go client's oauthEscape.
 */
export function percentEncode(input: string): string {
  let out = "";
  const bytes = Buffer.from(input, "utf8");
  for (const b of bytes) {
    const ch = String.fromCharCode(b);
    if (
      (ch >= "A" && ch <= "Z") ||
      (ch >= "a" && ch <= "z") ||
      (ch >= "0" && ch <= "9") ||
      ch === "-" ||
      ch === "." ||
      ch === "_" ||
      ch === "~"
    ) {
      out += ch;
    } else {
      out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

/**
 * Builds the OAuth 1.0a signature base string:
 *   METHOD & enc(baseUrl) & enc(sorted & joined params)
 * Params are the query-string params plus the oauth_* params plus any
 * body params, each percent-encoded, then sorted lexicographically.
 */
export function buildBaseString(
  method: string,
  baseUrl: string,
  params: Record<string, string>,
): string {
  const pairs = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .sort();
  return method.toUpperCase() + "&" + percentEncode(baseUrl) + "&" + percentEncode(pairs.join("&"));
}

/** Options to make signing deterministic in tests. */
export interface SignOptions {
  nonce?: string;
  timestamp?: number;
  /** Extra non-oauth params folded into the base string (e.g. a POST body field). */
  bodyParams?: Record<string, string>;
}

export interface SignedRequest {
  header: string;
  signature: string;
  baseString: string;
}

/**
 * Signs a request with OAuth 1.0a (HMAC-SHA1) and returns the
 * `Authorization` header value, the raw signature, and the base string.
 * The URL's query string is parsed and folded into the base string, exactly
 * as Hattrick's CHPP endpoint requires.
 */
export function sign(
  method: string,
  url: string,
  creds: OAuthCredentials,
  opts: SignOptions = {},
): SignedRequest {
  const u = new URL(url);
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_token: creds.accessToken,
    oauth_nonce: opts.nonce ?? randomBytes(16).toString("hex"),
    oauth_timestamp: String(opts.timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };

  const allParams: Record<string, string> = { ...oauthParams, ...(opts.bodyParams ?? {}) };
  for (const [k, v] of u.searchParams.entries()) {
    allParams[k] = v;
  }

  const baseString = buildBaseString(method, baseUrl, allParams);
  const key = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.accessSecret)}`;
  const signature = createHmac("sha1", key).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;
  const header =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .sort()
      .join(", ");

  return { header, signature, baseString };
}
