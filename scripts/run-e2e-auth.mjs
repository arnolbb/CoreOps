import { spawnSync } from "node:child_process";

const result = spawnSync(
  "node",
  ["scripts/run-with-local-supabase-env.mjs", "npx", "playwright", "test"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
