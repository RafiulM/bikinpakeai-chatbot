import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, signUp } from "./support/session";

let owner: APIRequestContext;
let stranger: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  stranger = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  await signUp(owner, "tickets-owner");
  await signUp(stranger, "tickets-stranger");
});

test.afterAll(async () => {
  await owner?.dispose();
  await stranger?.dispose();
});

/** Sends a message that the rules escalate, returning its ticket code. */
async function escalate(content: string) {
  const { data: conversation } = await (
    await owner.post("/api/conversations", { headers, data: {} })
  ).json();
  const { data } = await (
    await owner.post(`/api/conversations/${conversation.id}/messages`, {
      headers,
      data: { content },
    })
  ).json();
  expect(data.turn.ticketId).toMatch(/^T-\d+$/);
  return data.turn.ticketId as string;
}

test("the queue lists the caller's escalations with filters and counts", async () => {
  expect((await stranger.get("/api/tickets")).status()).toBe(200);
  const angry = await escalate(
    "Sudah 3 hari begini, saya kecewa banget. Mau refund aja.",
  );
  const calmer = await escalate(
    "Tolong refund langganan AndalAI saya bulan ini.",
  );

  const response = await owner.get("/api/tickets");
  expect(response.status()).toBe(200);
  const { data, meta } = await response.json();
  expect(meta.counts).toMatchObject({ open: 2, claimed: 0, closed: 0 });
  expect(data.map((ticket: { code: string }) => ticket.code)).toEqual([
    angry,
    calmer,
  ]);
  expect(data[0]).toMatchObject({
    priority: "urgent",
    status: "open",
    claimedBy: null,
    conversationCode: expect.stringMatching(/^#A-\d+$/),
  });
  expect(data[0].excerpt[0]).toMatchObject({
    sender: "customer",
    label: "Pelanggan",
  });
  expect(data[0].excerpt.at(-1)).toMatchObject({
    sender: "bot",
    label: "Bot dengan Jev",
  });
  expect(data[0].summaryPoints.length).toBeGreaterThan(1);

  const search = await (await owner.get("/api/tickets?q=andalai")).json();
  expect(search.data.map((ticket: { code: string }) => ticket.code)).toEqual([
    calmer,
  ]);
  const waiting = await (await owner.get("/api/tickets?sort=waiting")).json();
  expect(waiting.data[0].code).toBe(angry);

  const db = testDb();
  try {
    await db.query(
      "UPDATE tickets SET status = 'closed', closed_at = now() WHERE number = $1",
      [Number(calmer.slice(2))],
    );
  } finally {
    await db.end();
  }
  const done = await (await owner.get("/api/tickets?filter=done")).json();
  expect(done.data.map((ticket: { code: string }) => ticket.code)).toEqual([
    calmer,
  ]);
  expect(done.meta.counts).toMatchObject({ open: 1, closed: 1 });

  const others = await (await stranger.get("/api/tickets?filter=all")).json();
  expect(others.data).toEqual([]);
  expect(others.meta.total).toBe(0);

  for (const query of ["filter=late", "sort=random", "limit=0", "extra=1"]) {
    expect((await owner.get(`/api/tickets?${query}`)).status()).toBe(422);
  }
});

test("ticket endpoints require a session", async ({ request }) => {
  const response = await request.get("/api/tickets");
  expect(response.status()).toBe(401);
});
