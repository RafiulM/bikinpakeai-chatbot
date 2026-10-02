import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env.server";
import * as schema from "./schema";

function connect() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => {
    console.error(
      "An idle PostgreSQL connection was lost. Check database availability.",
    );
  });
  return drizzle(pool, { schema });
}

// Prevent extra connection pools during development hot reloads.
const globalDb = globalThis as unknown as {
  starterPostgresDb?: ReturnType<typeof connect>;
};
export const db = globalDb.starterPostgresDb ?? connect();
if (process.env.NODE_ENV !== "production") globalDb.starterPostgresDb = db;
