import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { cookieHeader, headers, readEvents, signUp } from "./support/session";

let owner: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  await signUp(owner, "comparison");
});

test.afterAll(async () => {
  await owner?.dispose();
});

async function answer(
  messageId: string,
  mode: "with_jev" | "without_jev",
  verdict: "correct" | "wrong" | "escalated",
  latencyMs: number,
  costUsd: number,
  extra: { issues?: string[]; flags?: string[]; takeaway?: string } = {},
) {
  const db = testDb();
  try {
    await db.query(
      `INSERT INTO responses (message_id, mode, content, latency_ms, cost_usd, is_verified, verdict, verdict_label, issues, flags, takeaway)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        messageId,
        mode,
        `Jawaban ${mode}`,
        latencyMs,
        costUsd,
        mode === "with_jev",
        verdict,
        verdict === "wrong" ? "Salah" : "Tepat",
        JSON.stringify(extra.issues ?? []),
        JSON.stringify(extra.flags ?? []),
        extra.takeaway ?? null,
      ],
    );
  } finally {
    await db.end();
  }
}

test("comparison returns both answers, winners, deltas and totals", async () => {
  expect(
    (await owner.get(`/api/conversations/${randomUUID()}/comparison`)).status(),
  ).toBe(404);
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  const ids: string[] = [];
  for (const content of ["Akses kelas terkunci", "Ini nomor kartu saya"]) {
    const { data } = await (
      await owner.post(`/api/conversations/${conversation.id}/messages`, {
        headers,
        data: { content },
      })
    ).json();
    ids.push(data.message.id);
  }
  await answer(ids[0], "with_jev", "correct", 820, 0.0004, {
    takeaway: "Jev lebih spesifik",
  });
  await answer(ids[0], "without_jev", "correct", 2900, 0.0061);
  await answer(ids[1], "with_jev", "correct", 600, 0.0003);
  await answer(ids[1], "without_jev", "wrong", 3100, 0.0064, {
    issues: ["Mengulang nomor kartu"],
    flags: ["security"],
  });

  const response = await owner.get(
    `/api/conversations/${conversation.id}/comparison`,
  );
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.conversation.id).toBe(conversation.id);
  expect(data.rows).toHaveLength(2);
  expect(data.rows[0].winner).toBe("with_jev");
  expect(data.rows[0].turn.takeaway).toBe("Jev lebih spesifik");
  expect(data.rows[0].delta).toMatchObject({
    latencyMs: 2080,
    accuracy: "both_right",
  });
  expect(data.rows[1].delta.accuracy).toBe("jev_better");
  expect(data.rows[1].turn.withoutJev.review).toMatchObject({
    verdict: "wrong",
    issues: ["Mengulang nomor kartu"],
    flags: ["security"],
  });
  expect(data.summary).toMatchObject({
    compared: 2,
    jevBetterCount: 1,
    running: [
      { withJev: 1, withoutJev: 1 },
      { withJev: 1, withoutJev: 0.5 },
    ],
  });
  expect(data.summary.withJev.latencyMs).toBe(1420);
  expect(data.summary.withoutJev.security).toBe(1);
  expect(data.summary.withJev.costUsd).toBeCloseTo(0.0007, 6);

  const totals = await owner.get(
    `/api/conversations/${conversation.id}/summary`,
  );
  expect(totals.status()).toBe(200);
  const { data: summary } = await totals.json();
  expect(summary.conversation.id).toBe(conversation.id);
  expect(summary).toMatchObject({
    compared: 2,
    jevBetterCount: 1,
    withJev: { answered: 2, correct: 2, latencyMs: 1420, security: 0 },
    withoutJev: { answered: 2, correct: 1, latencyMs: 6000, security: 1 },
  });
  expect(summary.speedup).toBeCloseTo(6000 / 1420, 6);
  expect(summary.costSaving).toBeCloseTo(1 - 0.0007 / 0.0125, 4);
  expect(
    (await owner.get(`/api/conversations/${randomUUID()}/summary`)).status(),
  ).toBe(404);
});

test("an empty conversation summarizes to zero without errors", async () => {
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  const { data } = await (
    await owner.get(`/api/conversations/${conversation.id}/summary`)
  ).json();
  expect(data).toMatchObject({
    compared: 0,
    speedup: null,
    costSaving: null,
    running: [],
  });
});

test("the events stream opens with the current totals and stays private", async ({
  request,
}) => {
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  const url = `http://localhost:3101/api/conversations/${conversation.id}/events`;
  expect((await request.get(url)).status()).toBe(401);
  expect(
    (
      await readEvents(
        `http://localhost:3101/api/conversations/${randomUUID()}/events`,
        await cookieHeader(owner),
        1,
      )
    ).status,
  ).toBe(404);

  const stream = await readEvents(url, await cookieHeader(owner), 1);
  expect(stream.status).toBe(200);
  expect(stream.contentType).toContain("text/event-stream");
  expect(stream.events[0].event).toBe("ready");
  expect(stream.events[0].data).toMatchObject({
    conversation: { id: conversation.id },
    compared: 0,
  });
});

test("conversation detail carries Jev readings and failed readings", async () => {
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  const ids: string[] = [];
  for (const content of ["Mau refund", "Pesan yang gagal dibaca"]) {
    const { data } = await (
      await owner.post(`/api/conversations/${conversation.id}/messages`, {
        headers,
        data: { content },
      })
    ).json();
    ids.push(data.message.id);
  }
  const db = testDb();
  try {
    await db.query(
      `INSERT INTO jev_analyses (message_id, status, product, issue_type, urgency, frustration_score, churn_risk, confidence, labels, decision, route, route_label, route_reason, rules, steps)
       VALUES ($1, 'done', 'DesainPakeAI', 'pembayaran', 'mendesak', 0.86, 0.78, 0.91, $2, 'escalated', 'escalate', 'Eskalasi', 'Frustrasi tinggi.', $3, $4)`,
      [
        ids[0],
        JSON.stringify([
          { label: "Produk", value: "DesainPakeAI", confidence: 0.93 },
        ]),
        JSON.stringify(["Frustrasi melewati ambang"]),
        JSON.stringify([
          { name: "Klasifikasi", note: "1 panggilan", durationMs: 220 },
        ]),
      ],
    );
    await db.query(
      "INSERT INTO jev_analyses (message_id, status, error) VALUES ($1, 'failed', 'Model klasifikasi tidak merespons.')",
      [ids[1]],
    );
  } finally {
    await db.end();
  }
  const { data } = await (
    await owner.get(`/api/conversations/${conversation.id}`)
  ).json();
  expect(data.turns[0].analysis).toMatchObject({
    decision: "escalated",
    route: "escalate",
    frustrationScore: 0.86,
    labels: [{ label: "Produk" }],
  });
  expect(data.turns[1]).toMatchObject({
    analysis: null,
    analysisStatus: "failed",
    analysisError: "Model klasifikasi tidak merespons.",
  });

  const debug = await owner.get(`/api/conversations/${conversation.id}/debug`);
  expect(debug.status()).toBe(200);
  const { data: cards } = await debug.json();
  expect(cards.cards.map((card: { status: string }) => card.status)).toEqual([
    "done",
    "failed",
  ]);
  expect(cards.cards[1].error).toBe("Model klasifikasi tidak merespons.");
  expect(cards.summary).toMatchObject({
    analyzed: 1,
    failed: 1,
    pending: 0,
    escalated: 1,
    masked: 0,
  });
  expect(
    (await owner.get(`/api/conversations/${randomUUID()}/debug`)).status(),
  ).toBe(404);
});
