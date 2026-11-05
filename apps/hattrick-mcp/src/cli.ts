#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadAccount } from "./config.js";
import { buildServer } from "./server.js";
import { startHttp } from "./http.js";

const VERSION = "0.0.0";

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "serve";

  if (cmd === "version") {
    process.stdout.write(VERSION + "\n");
    return;
  }

  if (cmd === "login") {
    const { runLogin } = await import("hattrick-chpp/node");
    const path = await runLogin();
    process.stdout.write(`\nSaved access token to ${path}\n`);
    return;
  }

  const account = loadAccount();

  if (cmd === "serve") {
    // stdout carries the MCP protocol; logs go to stderr.
    const server = buildServer(account, { version: VERSION });
    await server.connect(new StdioServerTransport());
    return;
  }

  if (cmd === "http") {
    await startHttp(() => buildServer(account, { version: VERSION }));
    return;
  }

  throw new Error(`unknown command ${JSON.stringify(cmd)} (use serve, http, login or version)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
