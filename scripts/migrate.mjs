import { resolve } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnvironment, root } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

await loadEnvironment();
let pool;
try {
  pool = new Pool({
    connectionString: databaseUrl(
      process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
    ),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () =>
    console.error("The PostgreSQL migration connection was interrupted."),
  );
  await migrate(drizzle(pool), { migrationsFolder: resolve(root, "drizzle") });
  console.log("PostgreSQL migrations applied.");
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  await pool?.end();
}
