import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function parseEnvLine(line) {
  const match =
    /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY)=\"(.*)\"$/.exec(
      line.trim(),
    );

  if (!match) {
    return null;
  }

  return [match[1], match[2]];
}

function getLocalSupabaseEnv() {
  const status = run("npx", [
    "supabase",
    "status",
    "-o",
    "env",
    "--override-name",
    "api.url=NEXT_PUBLIC_SUPABASE_URL",
    "--override-name",
    "auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);

  if (status.status !== 0) {
    process.stderr.write(status.stderr);
    process.exit(status.status ?? 1);
  }

  const supabaseEnv = {};

  for (const line of status.stdout.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (parsed) {
      const [name, value] = parsed;
      supabaseEnv[name] = value;
    }
  }

  if (!supabaseEnv.NEXT_PUBLIC_SUPABASE_URL) {
    process.stderr.write(
      "NEXT_PUBLIC_SUPABASE_URL missing from local Supabase status.\n",
    );
    process.exit(1);
  }

  if (!supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.stderr.write(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY missing from local Supabase status.\n",
    );
    process.exit(1);
  }

  return supabaseEnv;
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  process.stderr.write(
    "Usage: node scripts/run-with-local-supabase-env.mjs <command> [...args]\n",
  );
  process.exit(1);
}

const supabaseEnv = getLocalSupabaseEnv();
const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: supabaseEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
