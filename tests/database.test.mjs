import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { root } from "../scripts/lib.mjs";

test("PostgreSQL migrations preserve rows on rerun and enforce auth constraints", async () => {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
    "Run npm test to create an isolated database.",
  );
  const db = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "one",
      "One",
      "one@example.com",
    ]);
    await db.query(
      "INSERT INTO session (id, token, expires_at, user_id) VALUES ($1, $2, $3, $4)",
      ["session-one", "token-one", new Date(Date.now() + 60000), "one"],
    );
    await db.query("INSERT INTO notes (title, user_id) VALUES ($1, $2)", [
      "Migration persistence",
      "one",
    ]);
    const result = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url, MIGRATION_DATABASE_URL: url },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM "user"')).rows[0]
        .count,
      1,
    );
    const row = (
      await db.query(
        'SELECT email_verified, created_at FROM "user" WHERE id = $1',
        ["one"],
      )
    ).rows[0];
    assert.equal(row.email_verified, false);
    assert.ok(row.created_at instanceof Date);
    await assert.rejects(
      db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
        "two",
        "Two",
        "one@example.com",
      ]),
      { code: "23505" },
    );
    await assert.rejects(
      db.query(
        "INSERT INTO session (id, token, expires_at, user_id) VALUES ($1, $2, $3, $4)",
        ["invalid", "invalid-token", new Date(), "missing"],
      ),
      { code: "23503" },
    );
    const note = (
      await db.query(
        "SELECT id, content, created_at FROM notes WHERE user_id = $1",
        ["one"],
      )
    ).rows[0];
    assert.match(note.id, /^[0-9a-f-]{36}$/);
    assert.equal(note.content, "");
    assert.ok(note.created_at instanceof Date);
    await assert.rejects(
      db.query("INSERT INTO notes (title, user_id) VALUES ($1, $2)", [
        "Orphan",
        "missing",
      ]),
      { code: "23503" },
    );
    await db.query('DELETE FROM "user" WHERE id = $1', ["one"]);
    assert.equal(
      (await db.query("SELECT count(*)::int AS count FROM notes")).rows[0]
        .count,
      0,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS count FROM session")).rows[0]
        .count,
      0,
    );
  } finally {
    await db.end();
  }
});
