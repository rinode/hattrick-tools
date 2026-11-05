#!/usr/bin/env node
import { runLogin } from "./credentials.js";

runLogin()
  .then((path) => process.stdout.write(`\nSaved access token to ${path}\n`))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
