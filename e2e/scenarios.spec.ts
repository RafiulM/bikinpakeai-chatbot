import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, signUp } from "./support/session";

let client: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  client = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  await signUp(client, "scenarios");
});

test.afterAll(async () => {
  await client?.dispose();
});

test("scenarios are listed per category in display order", async ({
  request,
}) => {
  expect((await request.get("/api/scenarios")).status()).toBe(401);
  const response = await client.get("/api/scenarios");
  expect(response.status()).toBe(200);
  const { data, meta } = await response.json();
  expect(data.map((group: { id: string }) => group.id)).toEqual([
    "pembayaran",
    "akses_akun",
    "cara_pakai",
    "bug",
    "saran_fitur",
  ]);
  expect(meta.total).toBe(11);
  expect(data[0]).toMatchObject({ label: "Pembayaran", count: 3 });
  expect(data[0].scenarios[0]).toMatchObject({
    id: "paid-not-active",
    category: "pembayaran",
    expectedRoute: "Model cepat",
  });

  const bugs = await (await client.get("/api/scenarios?category=bug")).json();
  expect(bugs.data).toHaveLength(1);
  expect(bugs.meta.total).toBe(2);
  expect((await client.get("/api/scenarios?category=lainnya")).status()).toBe(
    422,
  );
});

test("running a scenario sends it through the full pipeline", async ({
  playwright,
}) => {
  const { data: conversation } = await (
    await client.post("/api/conversations", { headers, data: {} })
  ).json();
  const response = await client.post("/api/scenarios/promo-injection/run", {
    headers,
    data: { conversationId: conversation.id },
  });
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data.scenario.id).toBe("promo-injection");
  expect(data.turn.message.content).toBe(data.scenario.prompt);
  expect(data.turn.analysis).toMatchObject({ decision: "blocked" });

  const db = testDb();
  try {
    const { rows } = await db.query(
      "SELECT scenario_id FROM messages WHERE id = $1",
      [data.turn.message.id],
    );
    expect(rows[0].scenario_id).toBe("promo-injection");
  } finally {
    await db.end();
  }

  const masked = await (
    await client.post("/api/scenarios/card-number/run", {
      headers,
      data: { conversationId: conversation.id },
    })
  ).json();
  expect(masked.data.turn.message.isMasked).toBe(true);

  expect(
    (
      await client.post("/api/scenarios/unknown-case/run", {
        headers,
        data: { conversationId: conversation.id },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await client.post("/api/scenarios/promo-injection/run", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(422);

  const other = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  try {
    await signUp(other, "scenarios-other");
    expect(
      (
        await other.post("/api/scenarios/promo-injection/run", {
          headers,
          data: { conversationId: conversation.id },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await other.dispose();
  }
});
