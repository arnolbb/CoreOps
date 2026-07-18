import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const tests = ["organization_memberships_rls.sql"];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function findDatabaseContainer() {
  const result = run("docker", [
    "ps",
    "--format",
    "{{.Names}}",
    "--filter",
    "name=supabase_db_",
  ]);

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  const containers = result.stdout
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  const preferred = containers.find((name) => name === "supabase_db_CoreOps");
  return preferred ?? containers[0];
}

const databaseContainer = findDatabaseContainer();

if (!databaseContainer) {
  process.stderr.write(
    "No local Supabase database container found. Run `npm run supabase:start` first.\n",
  );
  process.exit(1);
}

for (const test of tests) {
  const testPath = join(process.cwd(), "supabase", "tests", test);
  const sql = readFileSync(testPath, "utf8");

  process.stdout.write(`Running ${test}\n`);

  const result = run(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-f",
      "-",
    ],
    { input: sql },
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.stdout.write("Database tests passed.\n");
