import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { headers, signUp } from "./support/session";

// Two accounts shared by this file keep the real auth server's signup rate
// limit out of the way. Each test still creates its own conversations.
let owner: APIRequestContext;
let stranger: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  owner = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  stranger = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  await signUp(owner, "conversation-owner");
  await signUp(stranger, "conversation-stranger");
});

test.afterAll(async () => {
  await owner?.dispose();
  await stranger?.dispose();
});

async function startConversation() {
  const response = await owner.post("/api/conversations", {
    headers,
    data: {},
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as {
    data: { id: string; code: string; status: string };
    meta: { endedIds: string[] };
  };
}

test("conversation endpoints require a real session", async ({ request }) => {
  for (const [method, url] of [
    ["GET", "/api/conversations"],
    ["POST", "/api/conversations"],
    ["GET", `/api/conversations/${randomUUID()}`],
    ["POST", `/api/conversations/${randomUUID()}/messages`],
    ["GET", "/api/suggestions"],
  ]) {
    const response = await request.fetch(url, {
      method,
      headers,
      data: method === "POST" ? { content: "Halo" } : undefined,
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("customer messages are stored masked and validated", async () => {
  const { data: conversation } = await startConversation();
  expect(conversation.code).toMatch(/^#A-\d+$/);
  expect(conversation.status).toBe("active");
  expect(conversation).not.toHaveProperty("userId");

  const url = `/api/conversations/${conversation.id}/messages`;
  const sent = await owner.post(url, {
    headers,
    data: {
      content: "  Ini nomor kartu saya 4111 1111 1111 1111, tolong cek  ",
    },
  });
  expect(sent.status()).toBe(201);
  const { data } = await sent.json();
  expect(data.message).toMatchObject({
    content: "Ini nomor kartu saya 4111 •••• •••• 1111, tolong cek",
    isMasked: true,
    sender: "customer",
    conversationId: conversation.id,
  });

  for (const body of [
    { content: "   " },
    { content: "x".repeat(2001) },
    { content: "Halo", userId: "someone" },
  ]) {
    expect((await owner.post(url, { headers, data: body })).status()).toBe(422);
  }
  const notJson = await owner.post(url, {
    headers: { ...headers, "Content-Type": "text/plain" },
    data: "Halo",
  });
  expect(notJson.status()).toBe(415);
  expect((await owner.post(url, { data: { content: "Halo" } })).status()).toBe(
    403,
  );
  expect(
    (
      await owner.post("/api/conversations/not-a-uuid/messages", {
        headers,
        data: { content: "Halo" },
      })
    ).status(),
  ).toBe(404);
});

test("another account cannot read or write someone else's conversation", async () => {
  const { data: conversation } = await startConversation();
  const write = await stranger.post(
    `/api/conversations/${conversation.id}/messages`,
    { headers, data: { content: "Bukan punyaku" } },
  );
  expect(write.status()).toBe(404);
  expect(await write.json()).toEqual({
    error: { code: "NOT_FOUND", message: "Conversation not found." },
  });
  expect(
    (await stranger.get(`/api/conversations/${conversation.id}`)).status(),
  ).toBe(404);
  const list = await (await stranger.get("/api/conversations")).json();
  expect(list.data.map((item: { id: string }) => item.id)).not.toContain(
    conversation.id,
  );
});

test("history endpoints return the caller's conversations as ordered turns", async () => {
  const { data: first } = await startConversation();
  for (const content of ["Pesan pertama", "Pesan kedua"]) {
    expect(
      (
        await owner.post(`/api/conversations/${first.id}/messages`, {
          headers,
          data: { content },
        })
      ).status(),
    ).toBe(201);
  }
  const { data: second } = await startConversation();

  const detail = await owner.get(`/api/conversations/${first.id}`);
  expect(detail.status()).toBe(200);
  const { data: conversation } = await detail.json();
  expect(conversation.title).toBe("Pesan pertama");
  expect(
    conversation.turns.map(
      (turn: { message: { content: string } }) => turn.message.content,
    ),
  ).toEqual(["Pesan pertama", "Pesan kedua"]);
  // Every stored message is answered by the Jev path right away.
  expect(conversation.turns[0].withJev?.mode).toBe("with_jev");

  const page1 = await (await owner.get("/api/conversations?limit=1")).json();
  expect(page1.meta).toEqual({ limit: 1, offset: 0, hasMore: true });
  expect(page1.data[0].id).toBe(second.id);
  const page2 = await (
    await owner.get("/api/conversations?limit=1&offset=1")
  ).json();
  expect(page2.data[0]).toMatchObject({ id: first.id, messageCount: 2 });
  expect((await owner.get("/api/conversations?limit=0")).status()).toBe(422);
});

test("starting a new conversation ends the active one but keeps its history", async () => {
  const { data: first } = await startConversation();
  await owner.post(`/api/conversations/${first.id}/messages`, {
    headers,
    data: { content: "Masih tersimpan?" },
  });
  const restarted = await startConversation();
  expect(restarted.meta.endedIds).toEqual([first.id]);
  expect(restarted.data.status).toBe("active");

  const old = await (await owner.get(`/api/conversations/${first.id}`)).json();
  expect(old.data.status).toBe("ended");
  expect(old.data.turns).toHaveLength(1);
  const late = await owner.post(`/api/conversations/${first.id}/messages`, {
    headers,
    data: { content: "Terlambat" },
  });
  expect(late.status()).toBe(409);
  expect((await late.json()).error.code).toBe("CONVERSATION_ENDED");
  expect(
    (
      await owner.post("/api/conversations", {
        headers,
        data: { reset: true },
      })
    ).status(),
  ).toBe(422);
});

test("suggested questions come from the curated list", async () => {
  const response = await owner.get("/api/suggestions");
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data).toHaveLength(4);
  expect(data[0]).toEqual({
    id: "upgrade-pro",
    text: "Cara upgrade ke membership Pro?",
    product: "Membership",
    category: "pembayaran",
  });
  expect(
    (await (await owner.get("/api/suggestions?limit=6")).json()).data,
  ).toHaveLength(6);
  expect((await owner.get("/api/suggestions?limit=99")).status()).toBe(422);
});

test("the current endpoint returns the newest active conversation", async ({
  request,
}) => {
  expect((await request.get("/api/conversations/current")).status()).toBe(401);
  const { data: started } = await startConversation();
  await owner.post(`/api/conversations/${started.id}/messages`, {
    headers,
    data: { content: "Yang aktif sekarang" },
  });
  const response = await owner.get("/api/conversations/current");
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.id).toBe(started.id);
  expect(data.turns).toHaveLength(1);
  const strangerCurrent = await (
    await stranger.get("/api/conversations/current")
  ).json();
  expect(strangerCurrent.data?.id).not.toBe(started.id);
});

test("the active view is saved per conversation and validated", async () => {
  const { data: conversation } = await startConversation();
  expect(conversation).toMatchObject({ activeView: "customer" });
  const url = `/api/conversations/${conversation.id}`;
  const saved = await owner.patch(url, {
    headers,
    data: { activeView: "compare" },
  });
  expect(saved.status()).toBe(200);
  expect((await saved.json()).data.activeView).toBe("compare");
  expect((await (await owner.get(url)).json()).data.activeView).toBe("compare");

  for (const body of [
    { activeView: "settings" },
    {},
    { activeView: "debug", title: "x" },
  ]) {
    expect((await owner.patch(url, { headers, data: body })).status()).toBe(
      422,
    );
  }
  expect(
    (await owner.patch(url, { data: { activeView: "debug" } })).status(),
  ).toBe(403);
  expect(
    (
      await stranger.patch(url, { headers, data: { activeView: "debug" } })
    ).status(),
  ).toBe(404);
  expect((await (await owner.get(url)).json()).data.activeView).toBe("compare");
});
