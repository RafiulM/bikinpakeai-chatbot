import { defineConfig, devices } from "@playwright/test";

const testUrl = process.env.STARTER_TEST_DATABASE_URL;
if (!testUrl || !process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-")) {
  throw new Error(
    "Use npm run test:e2e so Playwright runs against its own disposable PostgreSQL server.",
  );
}
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3101", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run start",
      url: "http://localhost:3101",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: "production",
        PORT: "3101",
        BETTER_AUTH_URL: "http://localhost:3101",
        DATABASE_URL: testUrl,
        MIGRATION_DATABASE_URL: testUrl,
        // Local answer engine: deterministic, no network, no API key.
        OPENROUTER_API_KEY: "",
      },
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
    {
      // Same app with OpenRouter configured but unreachable, to prove the
      // pipeline survives a failed Jev reading (e2e/pipeline-failure.spec.ts).
      command: "npm run start",
      url: "http://localhost:3102",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: "production",
        PORT: "3102",
        BETTER_AUTH_URL: "http://localhost:3102",
        DATABASE_URL: testUrl,
        MIGRATION_DATABASE_URL: testUrl,
        OPENROUTER_API_KEY: "test-key-for-unreachable-endpoint",
        OPENROUTER_BASE_URL: "http://127.0.0.1:9/api/v1",
        LAB_JEV_TIMEOUT_MS: "2000",
        LAB_MODEL_TIMEOUT_MS: "2000",
      },
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
  ],
});
