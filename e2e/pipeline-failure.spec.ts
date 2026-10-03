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
