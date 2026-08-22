import { defineConfig, devices } from "@playwright/test";

/**
 * The stack under test comes from scripts/e2e.sh: the web app on :3210, the
 * API on :8210, MinIO on :9100, and a throwaway companyos_e2e database. One
 * worker, because every spec talks to the same servers.
 */
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_WEB_ORIGIN ?? "http://localhost:3210",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
});
