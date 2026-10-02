import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

function pool() {
  const url = process.env.STARTER_TEST_DATABASE_URL;
  assert.ok(
    url && process.env.STARTER_TEST_RUN?.startsWith("starter-pg-test-"),
    "Run npm test to create an isolated database.",
  );
  return new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
}

test("conversations number themselves and cascade to their messages", async () => {
  const db = pool();
  try {
    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "lab-owner",
      "Lab Owner",
      "lab-owner@example.com",
    ]);
    const first = await db.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING id, number, title, status",
      ["lab-owner"],
    );
    const second = await db.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING number",
      ["lab-owner"],
    );
    assert.ok(first.rows[0].number >= 1001);
    assert.equal(second.rows[0].number, first.rows[0].number + 1);
    assert.equal(first.rows[0].title, "Percakapan baru");
    assert.equal(first.rows[0].status, "active");

    const conversationId = first.rows[0].id;
    await db.query(
      "INSERT INTO messages (conversation_id, sender, content, is_masked) VALUES ($1, 'customer', $2, true)",
      [conversationId, "Ini nomor kartu saya 4111 •••• •••• 1111"],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO messages (conversation_id, sender, content) VALUES ($1, 'robot', 'x')",
        [conversationId],
      ),
      /messages_sender_check/,
    );
    await assert.rejects(
      db.query("UPDATE conversations SET status = 'archived' WHERE id = $1", [
        conversationId,
      ]),
      /conversations_status_check/,
    );

    await db.query("DELETE FROM conversations WHERE id = $1", [conversationId]);
    const left = await db.query(
      "SELECT count(*)::int AS count FROM messages WHERE conversation_id = $1",
      [conversationId],
    );
    assert.equal(left.rows[0].count, 0);
  } finally {
    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-owner"]);
    await db.end();
  }
});
