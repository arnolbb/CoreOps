import { defineConfig, devices } from "@playwright/test";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: appUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_URL: appUrl,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SMTP_HOST: process.env.SMTP_HOST ?? "127.0.0.1",
      SMTP_PORT: process.env.SMTP_PORT ?? "54325",
      SMTP_SECURE: process.env.SMTP_SECURE ?? "false",
      INVITATION_EMAIL_FROM:
        process.env.INVITATION_EMAIL_FROM ?? "CoreOps <no-reply@coreops.local>",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
