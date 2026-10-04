import { sql } from "drizzle-orm";
import { db } from "@/db/index.server";

// Readiness: true when PostgreSQL answers a trivial query. The pool's own
// connection timeout bounds how long an unreachable database can take.
export async function databaseReachable() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
