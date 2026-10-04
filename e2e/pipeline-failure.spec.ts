import { expect, test, type APIRequestContext } from "@playwright/test";
import { failureOrigin } from "./support/session";

// This app instance has OpenRouter configured to an address that refuses
// connections, so every model call fails for real.

const origin = failureOrigin;
const headers = { Origin: origin };
let client: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  client = await playwright.request.newContext({ baseURL: origin });
  const data = {
    name: "Failure Tester",
    email: `failure-${Date.now()}@example.com`,
    password: "Failure-test-password-123!",
  };
  const response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  expect(response.status()).toBe(200);
});

test.afterAll(async () => {
  await client?.dispose();
});

test("a failed Jev reading is recorded and the customer still gets an answer", async () => {
  const { data: conversation } = await (
    await client.post("/api/conversations", { headers, data: {} })
  ).json();
  const response = await client.post(
    `/api/conversations/${conversation.id}/messages`,
    { headers, data: { content: "Bagaimana cara ekspor PRD ke PDF?" } },
  );
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  expect(data.turn.analysis).toBeNull();
  expect(data.turn.analysisStatus).toBe("failed");
  expect(data.turn.analysisError).toMatch(/model/i);
  expect(data.turn.withJev.content.length).toBeGreaterThan(20);
  expect(data.turn.withJev.isVerified).toBe(true);

  const { data: debug } = await (
    await client.get(`/api/conversations/${conversation.id}/debug`)
  ).json();
  expect(debug.cards[0]).toMatchObject({ status: "failed" });
  expect(debug.summary.failed).toBe(1);
});

test("a failed baseline tells live viewers why instead of leaving them waiting", async ({
  browser,
}) => {
  const { data: conversation } = await (
    await client.post("/api/conversations", { headers, data: {} })
  ).json();
  const { cookies } = await client.storageState();
  const events = await fetch(
    `${origin}/api/conversations/${conversation.id}/events`,
    {
      headers: {
        cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  expect(events.status).toBe(200);

  const response = await client.post(
    `/api/conversations/${conversation.id}/messages`,
    { headers, data: { content: "Bagaimana cara ekspor PRD ke PDF?" } },
  );
  expect(response.status()).toBe(201);
  const { data } = await response.json();

  // Read the stream until the baseline's failure arrives.
  const reader = events.body!.getReader();
  const decoder = new TextDecoder();
  let received = "";
  while (!received.includes("event: answer_failed")) {
    const { value, done } = await reader.read();
    if (done) break;
    received += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  const line = received
    .split("\n\n")
    .find((block) => block.includes("event: answer_failed"))
    ?.split("\n")
    .find((row) => row.startsWith("data: "));
  expect(JSON.parse(line!.slice(6))).toMatchObject({
    type: "answer_failed",
    messageId: data.turn.message.id,
    failure: { mode: "without_jev", error: expect.stringMatching(/model/i) },
  });

  // The failure is stored, so a reload still explains the missing answer.
  const { data: stored } = await (
    await client.get(`/api/conversations/${conversation.id}`)
  ).json();
  expect(stored.turns[0].withoutJev).toBeNull();
  expect(stored.turns[0].answerFailures.without_jev).toMatchObject({
    mode: "without_jev",
    error: expect.stringMatching(/model/i),
  });

  // Chat shows the reason in the Tanpa Jev column; Debug explains the path.
  const context = await browser.newContext({
    baseURL: origin,
    storageState: await client.storageState(),
  });
  const page = await context.newPage();
  await page.goto(`/compare?c=${conversation.id}`);
  await expect(
    page.getByRole("region", { name: "Jawaban tanpa Jev" }),
  ).toContainText(/model/i);
  await page.goto(`/debug?c=${conversation.id}`);
  await page.getByRole("radio", { name: "Tanpa Jev" }).check();
  await expect(page.getByRole("alert")).toContainText("Tidak ada jawaban");
  await expect(page.getByText("Dilewati")).toHaveCount(3);
  await context.close();
});
