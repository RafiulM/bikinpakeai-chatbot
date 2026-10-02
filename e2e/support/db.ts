import { Pool } from "pg";

/** Direct access to the disposable test database for arranging fixtures. */
export function testDb() {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  if (!url)
    throw new Error("Run npm run test:e2e to get a disposable database.");
  return new Pool({ connectionString: url, max: 1 });
}
