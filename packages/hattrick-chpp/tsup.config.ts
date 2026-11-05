import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/credentials.ts", "src/cli-login.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
