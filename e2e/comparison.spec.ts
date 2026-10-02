import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, signUp } from "./support/session";

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
});
