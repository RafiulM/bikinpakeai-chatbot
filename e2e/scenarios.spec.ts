import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { cookieHeader, headers, readEvents, signUp } from "./support/session";

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

test("a batch runs scenarios in order and reports progress live", async () => {
  const { data: conversation } = await (
    await client.post("/api/conversations", { headers, data: {} })
  ).json();
  const stream = readEvents(
    `http://localhost:3101/api/conversations/${conversation.id}/events`,
    await cookieHeader(client),
    20,
    6000,
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  const ids = ["paid-not-active", "promo-injection", "export-deadline"];
  const response = await client.post("/api/scenarios/batch", {
    headers,
    data: { conversationId: conversation.id, scenarioIds: ids },
  });
  expect(response.status()).toBe(200);
  const { data, meta } = await response.json();
  expect(meta).toEqual({ total: 3, done: 3 });
  expect(
    data.results.map((item: { scenarioId: string }) => item.scenarioId),
  ).toEqual(ids);
  expect(data.results[1].decision).toBe("blocked");
  expect(data.results[2]).toMatchObject({
    decision: "escalated",
    ticketId: expect.stringMatching(/^T-/),
  });

  const detail = await (
    await client.get(`/api/conversations/${conversation.id}`)
  ).json();
  expect(
    detail.data.turns.map(
      (turn: { message: { id: string } }) => turn.message.id,
    ),
  ).toEqual(data.results.map((item: { messageId: string }) => item.messageId));

  const { events } = await stream;
  const progress = events
    .filter((event) => event.event === "scenario_run")
    .map((event) => {
      const item = event.data as { index: number; state: string };
      return `${item.index}:${item.state}`;
    });
  expect(progress).toEqual([
    "0:running",
    "0:done",
    "1:running",
    "1:done",
    "2:running",
    "2:done",
  ]);
});

test("batch input is validated before anything runs", async () => {
  const { data: conversation } = await (
    await client.post("/api/conversations", { headers, data: {} })
  ).json();
  const post = (data: unknown) =>
    client.post("/api/scenarios/batch", { headers, data });
  const unknown = await post({
    conversationId: conversation.id,
    scenarioIds: ["dark-mode", "nope"],
  });
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).error.details).toEqual([
    { field: "scenarioIds", message: "nope" },
  ]);
  for (const body of [
    { conversationId: conversation.id, scenarioIds: [] },
    {
      conversationId: conversation.id,
      scenarioIds: ["dark-mode", "dark-mode"],
    },
    {
      conversationId: conversation.id,
      scenarioIds: Array.from({ length: 21 }, (_, i) => `s-${i}`),
    },
    { scenarioIds: ["dark-mode"] },
  ]) {
    expect((await post(body)).status()).toBe(422);
  }
  const detail = await (
    await client.get(`/api/conversations/${conversation.id}`)
  ).json();
  expect(detail.data.turns).toHaveLength(0);
});
