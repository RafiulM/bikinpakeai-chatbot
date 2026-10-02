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

test("each message keeps at most one answer per mode with valid metrics", async () => {
  const db = pool();
  try {
    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "lab-responses",
      "Lab Responses",
      "lab-responses@example.com",
    ]);
    const {
      rows: [conversation],
    } = await db.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING id",
      ["lab-responses"],
    );
    const {
      rows: [message],
    } = await db.query(
      "INSERT INTO messages (conversation_id, sender, content) VALUES ($1, 'customer', 'Halo') RETURNING id",
      [conversation.id],
    );
    const insert = (mode, verdict = "correct", latency = 800, cost = 0.0004) =>
      db.query(
        `INSERT INTO responses (message_id, mode, content, latency_ms, cost_usd, verdict, verdict_label, issues, flags)
         VALUES ($1, $2, 'Jawaban', $3, $4, $5, 'Label', $6, $7) RETURNING cost_usd, issues, flags`,
        [
          message.id,
          mode,
          latency,
          cost,
          verdict,
          JSON.stringify(["Masalah"]),
          JSON.stringify(["security"]),
        ],
      );
    const {
      rows: [jev],
    } = await insert("with_jev");
    assert.equal(Number(jev.cost_usd), 0.0004);
    assert.deepEqual(jev.issues, ["Masalah"]);
    await insert("without_jev", "wrong", 2900, 0.0061);
    await assert.rejects(insert("with_jev"), /responses_message_mode_idx/);
    await assert.rejects(insert("baseline"), /responses_mode_check/);
    await db.query("DELETE FROM responses WHERE message_id = $1", [message.id]);
    await assert.rejects(
      insert("with_jev", "maybe"),
      /responses_verdict_check/,
    );
    await assert.rejects(
      insert("with_jev", "correct", -1),
      /responses_metrics_check/,
    );
    await db.query("DELETE FROM messages WHERE id = $1", [message.id]);
  } finally {
    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-responses"]);
    await db.end();
  }
});

test("jev analyses keep one reading per message and enforce valid labels", async () => {
  const db = pool();
  try {
    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "lab-jev",
      "Lab Jev",
      "lab-jev@example.com",
    ]);
    const {
      rows: [conversation],
    } = await db.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING id",
      ["lab-jev"],
    );
    const {
      rows: [message],
    } = await db.query(
      "INSERT INTO messages (conversation_id, sender, content) VALUES ($1, 'customer', 'Mau refund') RETURNING id",
      [conversation.id],
    );
    const insert = (fields) => {
      const columns = Object.keys(fields);
      return db.query(
        `INSERT INTO jev_analyses (message_id, ${columns.join(", ")}) VALUES ($1, ${columns.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING *`,
        [message.id, ...Object.values(fields)],
      );
    };
    await assert.rejects(
      insert({ status: "done" }),
      /jev_analyses_done_fields_check/,
    );
    await assert.rejects(
      insert({
        status: "done",
        decision: "escalated",
        route: "escalate",
        issue_type: "pembayaran",
        frustration_score: 1.5,
      }),
      /jev_analyses_scores_check/,
    );
    await assert.rejects(
      insert({
        status: "done",
        decision: "ignored",
        route: "escalate",
        issue_type: "pembayaran",
      }),
      /jev_analyses_decision_check/,
    );
    const {
      rows: [failed],
    } = await insert({
      status: "failed",
      error: "Model klasifikasi tidak merespons.",
    });
    assert.equal(failed.status, "failed");
    await assert.rejects(
      insert({
        status: "done",
        decision: "escalated",
        route: "escalate",
        issue_type: "pembayaran",
      }),
      /jev_analyses_message_idx/,
    );
    await db.query("DELETE FROM jev_analyses WHERE message_id = $1", [
      message.id,
    ]);
    const {
      rows: [done],
    } = await insert({
      status: "done",
      decision: "escalated",
      route: "escalate",
      issue_type: "pembayaran",
      urgency: "mendesak",
      frustration_score: 0.86,
      labels: JSON.stringify([
        { label: "Produk", value: "DesainPakeAI", confidence: 0.93 },
      ]),
      steps: JSON.stringify([
        { name: "Klasifikasi", note: "1 panggilan Jev", durationMs: 220 },
      ]),
    });
    assert.equal(Number(done.frustration_score), 0.86);
    assert.equal(done.labels[0].label, "Produk");
    await db.query("DELETE FROM messages WHERE id = $1", [message.id]);
    const left = await db.query(
      "SELECT count(*)::int AS n FROM jev_analyses WHERE message_id = $1",
      [message.id],
    );
    assert.equal(left.rows[0].n, 0);
  } finally {
    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-jev"]);
    await db.end();
  }
});
