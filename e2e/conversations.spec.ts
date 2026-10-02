import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { headers, signUp } from "./support/session";

test("conversation endpoints require a real session", async ({ request }) => {
  for (const url of [
    "/api/conversations",
    `/api/conversations/${randomUUID()}/messages`,
  ]) {
    const response = await request.post(url, {
      headers,
      data: { content: "Halo" },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("customer messages are stored masked and validated", async ({
  request,
}) => {
  await signUp(request);
  const created = await request.post("/api/conversations", {
    headers,
    data: {},
  });
  expect(created.status()).toBe(201);
  const { data: conversation } = await created.json();
  expect(conversation.code).toMatch(/^#A-\d+$/);
  expect(conversation.status).toBe("active");
  expect(conversation).not.toHaveProperty("userId");

  const url = `/api/conversations/${conversation.id}/messages`;
  const sent = await request.post(url, {
    headers,
    data: {
      content: "  Ini nomor kartu saya 4111 1111 1111 1111, tolong cek  ",
    },
  });
  expect(sent.status()).toBe(201);
  const { data } = await sent.json();
  expect(data.message.content).toBe(
    "Ini nomor kartu saya 4111 •••• •••• 1111, tolong cek",
  );
  expect(data.message.isMasked).toBe(true);
  expect(data.message.sender).toBe("customer");
  expect(data.message.conversationId).toBe(conversation.id);

  for (const body of [
    { content: "   " },
    { content: "x".repeat(2001) },
    { content: "Halo", userId: "someone" },
  ]) {
    expect((await request.post(url, { headers, data: body })).status()).toBe(
      422,
    );
  }
  const notJson = await request.post(url, {
    headers: { ...headers, "Content-Type": "text/plain" },
    data: "Halo",
  });
  expect(notJson.status()).toBe(415);
  const noOrigin = await request.post(url, { data: { content: "Halo" } });
  expect(noOrigin.status()).toBe(403);
  expect(
    (
      await request.post("/api/conversations/not-a-uuid/messages", {
        headers,
        data: { content: "Halo" },
      })
    ).status(),
  ).toBe(404);
});

test("another account cannot write into someone else's conversation", async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  const stranger = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  try {
    await signUp(owner, "owner");
    await signUp(stranger, "stranger");
    const { data: conversation } = await (
      await owner.post("/api/conversations", { headers, data: {} })
    ).json();
    const response = await stranger.post(
      `/api/conversations/${conversation.id}/messages`,
      { headers, data: { content: "Bukan punyaku" } },
    );
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Conversation not found." },
    });
  } finally {
    await owner.dispose();
    await stranger.dispose();
  }
});
