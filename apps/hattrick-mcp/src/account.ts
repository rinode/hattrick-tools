import { writeFileSync } from "node:fs";
import {
  getAccessToken,
  getRequestToken,
  HattrickClient,
  type FetchLike,
} from "hattrick-chpp";

export interface AccountToken {
  accessToken: string;
  accessSecret: string;
}

/**
 * Holds the CHPP app identity (consumer key/secret) and the manager's access
 * token, and drives the OAuth login so the manager can authorise in-session
 * (login -> complete_login), the way the Go MCP does. The token is cached to
 * credentials.json on success so a restart stays logged in.
 */
export class Account {
  private token?: AccountToken;
  private pending?: { requestToken: string; requestSecret: string };

  constructor(
    private readonly consumerKey: string,
    private readonly consumerSecret: string,
    opts: { token?: AccountToken; credentialsPath?: string; fetchImpl?: FetchLike } = {},
  ) {
    this.token = opts.token;
    this.credentialsPath = opts.credentialsPath ?? "credentials.json";
    this.fetchImpl = opts.fetchImpl;
  }

  private readonly credentialsPath: string;
  private readonly fetchImpl?: FetchLike;

  get loggedIn(): boolean {
    return !!this.token;
  }

  /** A ready CHPP client, or throws if not logged in yet. */
  client(): HattrickClient {
    if (!this.token) {
      throw new Error(
        "not logged in — call login, open the URL, then complete_login with the code",
      );
    }
    return new HattrickClient(
      {
        consumerKey: this.consumerKey,
        consumerSecret: this.consumerSecret,
        accessToken: this.token.accessToken,
        accessSecret: this.token.accessSecret,
      },
      this.fetchImpl,
    );
  }

  /** Step 1: get the authorize URL; the manager grants access and gets a PIN. */
  async login(): Promise<string> {
    const r = await getRequestToken(this.consumerKey, this.consumerSecret, "oob", this.fetchImpl);
    this.pending = { requestToken: r.requestToken, requestSecret: r.requestSecret };
    return r.authorizeUrl;
  }

  /** Step 2: exchange the PIN for a durable token and cache it. */
  async completeLogin(code: string): Promise<void> {
    if (!this.pending) throw new Error("call login first");
    const t = await getAccessToken(
      this.consumerKey,
      this.consumerSecret,
      this.pending.requestToken,
      this.pending.requestSecret,
      code,
      this.fetchImpl,
    );
    if (!t.accessToken || !t.accessSecret) {
      throw new Error("login failed: no access token returned (wrong code?)");
    }
    this.token = { accessToken: t.accessToken, accessSecret: t.accessSecret };
    this.pending = undefined;
    try {
      writeFileSync(
        this.credentialsPath,
        JSON.stringify({ access_token: t.accessToken, access_secret: t.accessSecret }, null, 2) +
          "\n",
      );
    } catch {
      // caching is best-effort; the token still works for this session
    }
  }
}
