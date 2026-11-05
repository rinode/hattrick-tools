// OAuth 1.0a (HMAC-SHA1) signing for CHPP, written against Web-standard crypto
// (Web Crypto, TextEncoder, getRandomValues, btoa) so it runs unchanged on
// Node 18+, Cloudflare Workers and browsers — no node:crypto dependency.

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
 * (uppercase hex). Faithful port of the Go client's oauthEscape.
 */
export function percentEncode(input: string): string {
  let out = "";
  for (const b of new TextEncoder().encode(input)) {
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

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** A random OAuth nonce (16 bytes, hex), via Web Crypto getRandomValues. */
export function randomNonce(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** HMAC-SHA1(key, message) as base64, via Web Crypto (works on Node + Workers). */
export async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toBase64(new Uint8Array(sig));
}

/**
 * Signs a request with OAuth 1.0a (HMAC-SHA1) and returns the `Authorization`
 * header value, the raw signature, and the base string. The URL's query string
 * is parsed and folded into the base string, as the CHPP endpoint requires.
 * Async because Web Crypto's sign is async.
 */
export async function sign(
  method: string,
  url: string,
  creds: OAuthCredentials,
  opts: SignOptions = {},
): Promise<SignedRequest> {
  const u = new URL(url);
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_token: creds.accessToken,
    oauth_nonce: opts.nonce ?? randomNonce(),
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
  const signature = await hmacSha1Base64(key, baseString);

  oauthParams.oauth_signature = signature;
  const header =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
      .sort()
      .join(", ");

  return { header, signature, baseString };
}
