import { type OAuthCredentials, percentEncode, sign } from "./oauth.js";

export const CHPP_ENDPOINT = "https://chpp.hattrick.org/chppxml.ashx";
export const CHPP_OAUTH_BASE = "https://chpp.hattrick.org/oauth/";

/** A fetch implementation, injectable for testing. Defaults to global fetch. */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** Builds the CHPP request URL for a file/version with query parameters. */
export function buildUrl(
  file: string,
  version: string,
  values: Record<string, string> = {},
): string {
  const u = new URL(CHPP_ENDPOINT);
  u.searchParams.set("file", file);
  u.searchParams.set("version", version);
  for (const [k, v] of Object.entries(values)) {
    u.searchParams.set(k, v);
  }
  return u.toString();
}

/**
 * Low-level signed HTTP transport to chpp.hattrick.org. Mirrors the Go
 * client's rawClient: a signed GET for reads, and a hand-signed form POST
 * for the matchorders action (lineup in the body, signed over the query).
 */
export class Transport {
  constructor(
    private readonly creds: OAuthCredentials,
    private readonly fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
  ) {}

  async getRawXml(
    file: string,
    version: string,
    values: Record<string, string> = {},
  ): Promise<string> {
    const url = buildUrl(file, version, values);
    const { header } = await sign("GET", url, this.creds);
    const res = await this.fetchImpl(url, { method: "GET", headers: { Authorization: header } });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`CHPP GET ${file} failed: HTTP ${res.status}`);
    }
    return text;
  }

  async postRawXml(
    file: string,
    version: string,
    values: Record<string, string>,
    lineup: string,
  ): Promise<string> {
    const url = buildUrl(file, version, values);
    const { header } = await sign("POST", url, this.creds, { bodyParams: { lineup } });
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: header,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "lineup=" + percentEncode(lineup),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`CHPP POST ${file} failed: HTTP ${res.status}`);
    }
    return text;
  }
}
