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

test("tickets number themselves, keep closed_at consistent and cascade replies", async () => {
  const db = pool();
  try {
    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "lab-tickets",
      "Lab Tickets",
      "lab-tickets@example.com",
    ]);
    const {
      rows: [conversation],
    } = await db.query(
      "INSERT INTO conversations (user_id) VALUES ($1) RETURNING id",
      ["lab-tickets"],
    );
    const message = async (content) =>
      (
        await db.query(
          "INSERT INTO messages (conversation_id, sender, content) VALUES ($1, 'customer', $2) RETURNING id",
          [conversation.id, content],
        )
      ).rows[0];
    const insert = (messageId, extra = {}) =>
      db.query(
        `INSERT INTO tickets (conversation_id, message_id, title, priority, product, issue_label, summary, next_step, escalation_reason, status, closed_at)
         VALUES ($1, $2, 'Judul', $3, 'DesainPakeAI', 'Refund', 'Ringkasan', 'Langkah', 'Alasan', $4, $5) RETURNING id, number, status`,
        [
          conversation.id,
          messageId,
          extra.priority ?? "urgent",
          extra.status ?? "open",
          extra.closedAt ?? null,
        ],
      );
    const first = await message("Mau refund");
    const second = await message("Masih error");
    const {
      rows: [ticket],
    } = await insert(first.id);
    assert.ok(ticket.number >= 201);
    await assert.rejects(insert(first.id), /tickets_message_idx/);
    await assert.rejects(
      insert(second.id, { priority: "asap" }),
      /tickets_priority_check/,
    );
    await assert.rejects(
      insert(second.id, { status: "closed" }),
      /tickets_closed_at_check/,
    );
    await assert.rejects(
      db.query("UPDATE tickets SET status = 'closed' WHERE id = $1", [
        ticket.id,
      ]),
      /tickets_closed_at_check/,
    );
    await db.query(
      "UPDATE tickets SET status = 'closed', closed_at = now() WHERE id = $1",
      [ticket.id],
    );
    await db.query(
      "INSERT INTO ticket_replies (ticket_id, agent_name, content) VALUES ($1, 'Kamu', 'Sudah kami cek')",
      [ticket.id],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO ticket_replies (ticket_id, agent_name, content) VALUES ($1, 'Kamu', '')",
        [ticket.id],
      ),
      /ticket_replies_content_check/,
    );
    await db.query("DELETE FROM messages WHERE id = $1", [first.id]);
    const left = await db.query(
      "SELECT (SELECT count(*) FROM tickets WHERE id = $1)::int AS t, (SELECT count(*) FROM ticket_replies WHERE ticket_id = $1)::int AS r",
      [ticket.id],
    );
    assert.deepEqual(left.rows[0], { t: 0, r: 0 });
  } finally {
    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-tickets"]);
    await db.end();
  }
});

test("scenario reference data is seeded and matches the shared list", async () => {
  const db = pool();
  try {
    const { SCENARIOS } = await import("../src/lib/lab/scenarios.ts");
    const categories = await db.query(
      "SELECT id FROM scenario_categories ORDER BY position",
    );
    assert.deepEqual(
      categories.rows.map((row) => row.id),
      ["pembayaran", "akses_akun", "cara_pakai", "bug", "saran_fitur"],
    );
    const rows = await db.query(
      "SELECT id, category_id, prompt FROM scenarios ORDER BY position",
    );
    assert.deepEqual(
      rows.rows.map((row) => [row.id, row.category_id, row.prompt]),
      SCENARIOS.map((scenario) => [
        scenario.id,
        scenario.category,
        scenario.prompt,
      ]),
    );
    await assert.rejects(
      db.query("DELETE FROM scenario_categories WHERE id = 'bug'"),
      /scenarios_category_id_scenario_categories_id_fk/,
    );
    await assert.rejects(
      db.query(
        "INSERT INTO scenarios (id, category_id, name, prompt, position) VALUES ('Bad Id', 'bug', 'x', 'y', 99)",
      ),
      /scenarios_id_check/,
    );
  } finally {
    await db.end();
  }
});

test("test sets seed built-in cases and keep runs and results consistent", async () => {
  const db = pool();
  try {
    const sets = await db.query(
      "SELECT s.id, s.user_id, count(c.id)::int AS cases FROM test_sets s JOIN test_cases c ON c.test_set_id = s.id WHERE s.user_id IS NULL GROUP BY s.id ORDER BY s.position",
    );
    assert.equal(sets.rows.length, 3);
    for (const row of sets.rows) {
      assert.ok(row.cases >= 50 && row.cases <= 100, `${row.cases} cases`);
    }
    const setId = sets.rows[0].id;
    const [firstCase] = (
      await db.query(
        "SELECT id FROM test_cases WHERE test_set_id = $1 ORDER BY position LIMIT 1",
        [setId],
      )
    ).rows;
    await assert.rejects(
      db.query(
        "INSERT INTO test_cases (test_set_id, position, input_text, expected_label) VALUES ($1, 999, 'x', 'unknown')",
        [setId],
      ),
      /test_cases_expected_label_check/,
    );

    await db.query('INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)', [
      "lab-tester",
      "Lab Tester",
      "lab-tester@example.com",
    ]);
    const run = await db.query(
      "INSERT INTO test_runs (user_id, test_set_id, total) VALUES ($1, $2, $3) RETURNING id, number, status",
      ["lab-tester", setId, sets.rows[0].cases],
    );
    const runId = run.rows[0].id;
    assert.equal(run.rows[0].status, "running");
    await assert.rejects(
      db.query("UPDATE test_runs SET status = 'done' WHERE id = $1", [runId]),
      /test_runs_finished_at_check/,
    );
    await assert.rejects(
      db.query("UPDATE test_runs SET progress = total + 1 WHERE id = $1", [
        runId,
      ]),
      /test_runs_progress_check/,
    );
    const insertResult =
      "INSERT INTO test_results (test_run_id, test_case_id, mode, verdict, latency_ms, cost_usd) VALUES ($1, $2, $3, $4, 420, 0.0003)";
    await db.query(insertResult, [runId, firstCase.id, "with_jev", "correct"]);
    await assert.rejects(
      db.query(insertResult, [runId, firstCase.id, "with_jev", "wrong"]),
      /test_results_run_case_mode_idx/,
    );
    await assert.rejects(
      db.query(insertResult, [runId, firstCase.id, "without_jev", "maybe"]),
      /test_results_verdict_check/,
    );

    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-tester"]);
    const left = await db.query(
      "SELECT (SELECT count(*)::int FROM test_runs WHERE id = $1) AS runs, (SELECT count(*)::int FROM test_results WHERE test_run_id = $1) AS results, (SELECT count(*)::int FROM test_sets WHERE id = $2) AS sets",
      [runId, setId],
    );
    assert.deepEqual(left.rows[0], { runs: 0, results: 0, sets: 1 });
  } finally {
    await db.query('DELETE FROM "user" WHERE id = $1', ["lab-tester"]);
    await db.end();
  }
});
