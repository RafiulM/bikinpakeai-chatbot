import { expect, test, type APIRequestContext } from "@playwright/test";
import { testDb } from "./support/db";
import { headers, origin, signUp } from "./support/session";

let owner: APIRequestContext;
let other: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  const baseURL = origin;
  owner = await playwright.request.newContext({ baseURL });
  other = await playwright.request.newContext({ baseURL });
  await signUp(owner, "settings-owner");
  await signUp(other, "settings-other");
});

test.afterAll(async () => {
  await owner?.dispose();
  await other?.dispose();
});

// A made-up key in OpenRouter's format; it is never sent anywhere here.
const FAKE_KEY = `sk-or-v1-${"0".repeat(60)}9z8y`;

test("an account's OpenRouter key is stored encrypted and never returned", async ({
  request,
}) => {
  expect((await request.get("/api/settings/ai")).status()).toBe(401);
  const initial = await (await owner.get("/api/settings/ai")).json();
  expect(initial.data).toMatchObject({
    source: "none",
    accountKey: null,
    serverKey: false,
    models: { baseline: expect.any(String) },
  });
  const nothing = await owner.post("/api/settings/openrouter-key/check", {
    headers,
    data: {},
  });
  expect((await nothing.json()).data).toEqual({ status: "none" });

  const url = "/api/settings/openrouter-key";
  expect(
    (await request.put(url, { headers, data: { apiKey: FAKE_KEY } })).status(),
  ).toBe(401);
  expect(
    (
      await owner.put(url, {
        headers: { Origin: "https://evil.example" },
        data: { apiKey: FAKE_KEY },
      })
    ).status(),
  ).toBe(403);
  for (const data of [
    { apiKey: "hello" },
    { apiKey: "sk-or-short" },
    { apiKey: `${FAKE_KEY} extra` },
    { apiKey: FAKE_KEY, userId: "someone" },
  ])
    expect((await owner.put(url, { headers, data })).status()).toBe(422);

  const saved = await owner.put(url, { headers, data: { apiKey: FAKE_KEY } });
  expect(saved.status()).toBe(200);
  const body = await saved.text();
  expect(body).not.toContain(FAKE_KEY);
  expect(JSON.parse(body).data).toMatchObject({
    source: "account",
    accountKey: { hint: "…9z8y" },
    accountKeyUnreadable: false,
  });
  expect(await (await owner.get("/api/settings/ai")).text()).not.toContain(
    "0000000000",
  );

  const db = testDb();
  try {
    const rows = await db.query(
      "SELECT openrouter_key_encrypted AS sealed FROM account_ai_settings",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].sealed).toMatch(/^v1\./);
    expect(rows.rows[0].sealed).not.toContain("0000000000");
  } finally {
    await db.end();
  }

  // Keys are per account.
  expect(
    (await (await other.get("/api/settings/ai")).json()).data,
  ).toMatchObject({ source: "none", accountKey: null });

  const removed = await owner.delete(url, { headers });
  expect((await removed.json()).data).toMatchObject({
    source: "none",
    accountKey: null,
  });
});

test("demo data fills the account through the real pipeline", async ({
  request,
}) => {
  expect(
    (await request.post("/api/demo/seed", { headers, data: {} })).status(),
  ).toBe(401);
  expect(
    (await other.post("/api/demo/seed", { headers, data: { x: 1 } })).status(),
  ).toBe(422);

  const response = await other.post("/api/demo/seed", { headers, data: {} });
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data).toMatchObject({
    messages: 7,
    failed: 0,
    testSets: ["Support umum", "Keamanan & injeksi", "Eskalasi & frustrasi"],
  });
  expect(data.tickets).toBeGreaterThan(0);

  const conversation = (
    await (await other.get(`/api/conversations/${data.conversation.id}`)).json()
  ).data;
  expect(conversation.code).toBe(data.conversation.code);
  expect(conversation.turns).toHaveLength(7);
  expect(
    (await owner.get(`/api/conversations/${data.conversation.id}`)).status(),
  ).toBe(404);

  // The test sets run one after another in the background.
  let runs: { status: string }[] = [];
  for (let tries = 0; tries < 100; tries += 1) {
    runs = (await (await other.get("/api/test-runs?limit=5")).json()).data;
    if (runs.length === 3 && runs.every((run) => run.status === "done")) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  expect(runs.map((run) => run.status)).toEqual(["done", "done", "done"]);
});

test("display settings start in demo mode and are saved per account", async ({
  request,
}) => {
  const url = "/api/settings/display";
  expect((await request.get(url)).status()).toBe(401);
  expect((await (await owner.get(url)).json()).data).toEqual({
    demoMode: true,
    chatbot: "with_jev",
  });

  const off = { demoMode: false, chatbot: "without_jev" };
  expect((await request.put(url, { headers, data: off })).status()).toBe(401);
  expect(
    (
      await owner.put(url, {
        headers: { Origin: "https://evil.example" },
        data: off,
      })
    ).status(),
  ).toBe(403);
  for (const data of [
    { demoMode: false },
    { demoMode: "no", chatbot: "with_jev" },
    { demoMode: false, chatbot: "both" },
    { ...off, userId: "someone" },
  ])
    expect((await owner.put(url, { headers, data })).status()).toBe(422);

  const saved = await owner.put(url, { headers, data: off });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).data).toEqual(off);
  expect((await (await owner.get(url)).json()).data).toEqual(off);

  // Settings are per account.
  expect((await (await other.get(url)).json()).data).toEqual({
    demoMode: true,
    chatbot: "with_jev",
  });

  const back = { demoMode: true, chatbot: "without_jev" };
  expect(
    (await (await owner.put(url, { headers, data: back })).json()).data,
  ).toEqual(back);
});
