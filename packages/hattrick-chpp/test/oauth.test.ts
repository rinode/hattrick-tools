import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBaseString, percentEncode, sign } from "../src/oauth.js";

describe("percentEncode (RFC 5849)", () => {
  it("leaves unreserved characters untouched", () => {
    expect(percentEncode("aZ09-._~")).toBe("aZ09-._~");
  });
  it("encodes reserved and special characters uppercase", () => {
    expect(percentEncode(" ")).toBe("%20");
    expect(percentEncode("/")).toBe("%2F");
    expect(percentEncode("=")).toBe("%3D");
    expect(percentEncode("&")).toBe("%26");
  });
  it("encodes non-ASCII as UTF-8 bytes", () => {
    expect(percentEncode("ä")).toBe("%C3%A4");
  });
});

describe("buildBaseString", () => {
  const params = {
    file: "avatars",
    version: "1.1",
    oauth_consumer_key: "ck",
    oauth_token: "tok",
    oauth_nonce: "n",
    oauth_timestamp: "1",
    oauth_signature_method: "HMAC-SHA1",
    oauth_version: "1.0",
  };
  const base = buildBaseString("GET", "https://chpp.hattrick.org/chppxml.ashx", params);

  it("starts with METHOD & encoded base url", () => {
    expect(base.startsWith("GET&https%3A%2F%2Fchpp.hattrick.org%2Fchppxml.ashx&")).toBe(true);
  });

  it("sorts and encodes the parameter string", () => {
    const encodedParams = base.split("&").slice(2).join("&");
    const decoded = decodeURIComponent(encodedParams);
    expect(decoded).toBe(
      "file=avatars&oauth_consumer_key=ck&oauth_nonce=n&oauth_signature_method=HMAC-SHA1&" +
        "oauth_timestamp=1&oauth_token=tok&oauth_version=1.0&version=1.1",
    );
  });
});

describe("sign", () => {
  const creds = {
    consumerKey: "ck",
    consumerSecret: "cs",
    accessToken: "at",
    accessSecret: "as",
  };

  it("produces a deterministic HMAC-SHA1 signature for fixed nonce/timestamp", async () => {
    const url = "https://chpp.hattrick.org/chppxml.ashx?file=avatars&version=1.1";
    const r = await sign("GET", url, creds, { nonce: "abc", timestamp: 1700000000 });

    // Independently recompute the signature from the exposed base string.
    const expected = createHmac("sha1", "cs&as").update(r.baseString).digest("base64");
    expect(r.signature).toBe(expected);

    expect(r.header.startsWith("OAuth ")).toBe(true);
    expect(r.header).toContain('oauth_signature="');
    expect(r.header).toContain('oauth_consumer_key="ck"');
    expect(r.header).toContain('oauth_nonce="abc"');
  });

  it("is stable across calls with the same inputs", async () => {
    const url = "https://chpp.hattrick.org/chppxml.ashx?file=players&version=2.8&teamId=1";
    const a = await sign("GET", url, creds, { nonce: "x", timestamp: 1 });
    const b = await sign("GET", url, creds, { nonce: "x", timestamp: 1 });
    expect(a.signature).toBe(b.signature);
  });
});
