import { describe, expect, it } from "vitest";
import { Transport } from "../src/transport.js";
import type { FetchLike } from "../src/transport.js";

const creds = {
  consumerKey: "ck",
  consumerSecret: "cs",
  accessToken: "at",
  accessSecret: "as",
};

describe("Transport fetch invocation", () => {
  it("does not call the fetch impl with `this` bound to the Transport", async () => {
    // Workers throws "Illegal invocation" when the global fetch is called as a
    // method. Guard that the transport invokes fetch as a free function.
    let capturedThis: unknown = "unset";
    const fake = function (this: unknown) {
      capturedThis = this;
      return Promise.resolve(new Response("<HattrickData/>"));
    } as unknown as FetchLike;

    const t = new Transport(creds, fake);
    await t.getRawXml("teamdetails", "3.5");

    expect(capturedThis).not.toBe(t);
  });
});
