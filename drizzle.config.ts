import { defineConfig } from "drizzle-kit";

// Node's built-in parser reads .env.local then .env; values already in the
// environment win, so a supplied DATABASE_URL is never overridden.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file: nothing to load.
  }
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
