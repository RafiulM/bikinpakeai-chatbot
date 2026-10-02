import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };

async function signUp(client: APIRequestContext) {
  const data = {
    name: "API Builder",
    email: `notes-${randomUUID()}@example.com`,
    password: "Notes-test-password-123!",
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    // The real auth server limits rapid signups. Honor its retry window once.
    const seconds = Number(response.headers()["retry-after"] || 10);
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 10).toBe(
      true,
    );
    await delay((seconds + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
}

test("every Notes operation requires a real session and returns JSON errors", async ({
  request,
}) => {
  const id = randomUUID();
  for (const [method, url] of [
    ["GET", "/api/notes"],
    ["POST", "/api/notes"],
    ["GET", `/api/notes/${id}`],
    ["PATCH", `/api/notes/${id}`],
    ["DELETE", `/api/notes/${id}`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in to continue." },
    });
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("Notes supports persisted CRUD, bounded pagination, and partial updates", async ({
  request,
}) => {
  await signUp(request);
  const created = await request.post("/api/notes", {
    headers,
    data: { title: "  First note  ", content: "Keep me" },
  });
  expect(created.status()).toBe(201);
  const { data: first } = await created.json();
  expect(first.title).toBe("First note");
  expect(first.content).toBe("Keep me");
  expect(first).not.toHaveProperty("userId");
  expect(Number.isNaN(Date.parse(first.createdAt))).toBe(false);
  expect(created.headers().location).toBe(`/api/notes/${first.id}`);
  const other = await request.post("/api/notes", {
    headers,
    data: { title: "Second note" },
  });
  expect(other.status()).toBe(201);
  const { data: second } = await other.json();
  expect(second.content).toBe("");

  const pageOne = await (await request.get("/api/notes?limit=1")).json();
  const pageTwo = await (
    await request.get("/api/notes?limit=1&offset=1")
  ).json();
  expect(pageOne.meta).toEqual({ limit: 1, offset: 0, hasMore: true });
  expect(pageTwo.meta).toEqual({ limit: 1, offset: 1, hasMore: false });
  expect([pageOne.data[0].id, pageTwo.data[0].id]).toEqual([
    second.id,
    first.id,
  ]);
  expect(await (await request.get(`/api/notes/${first.id}`)).json()).toEqual({
    data: first,
  });

  const updated = await request.patch(`/api/notes/${first.id}`, {
    headers,
    data: { title: "Updated" },
  });
  expect(updated.status()).toBe(200);
  const { data: note } = await updated.json();
  expect(note.title).toBe("Updated");
  expect(note.content).toBe("Keep me");
  expect(Date.parse(note.updatedAt)).toBeGreaterThanOrEqual(
    Date.parse(first.updatedAt),
  );
  expect(
    (await (await request.get(`/api/notes/${first.id}`)).json()).data.title,
  ).toBe("Updated");
  const deleted = await request.delete(`/api/notes/${first.id}`, { headers });
  expect(deleted.status()).toBe(204);
  expect(await deleted.text()).toBe("");
  expect((await request.get(`/api/notes/${first.id}`)).status()).toBe(404);
  expect(
    (await request.delete(`/api/notes/${first.id}`, { headers })).status(),
  ).toBe(404);
});

test("one account cannot list, read, update, delete, or claim another account's note", async ({
  request,
  playwright,
}) => {
  await signUp(request);
  const created = await request.post("/api/notes", {
    headers,
    data: { title: "Private" },
  });
  expect(created.status()).toBe(201);
  const { data: note } = await created.json();
  const stranger = await playwright.request.newContext({ baseURL: origin });
  try {
    await signUp(stranger);
    expect((await (await stranger.get("/api/notes")).json()).data).toEqual([]);
    for (const method of ["GET", "PATCH", "DELETE"]) {
      const response = await stranger.fetch(`/api/notes/${note.id}`, {
        method,
        headers,
        ...(method === "PATCH" ? { data: { title: "Stolen" } } : {}),
      });
      const absent = await stranger.fetch(`/api/notes/${randomUUID()}`, {
        method,
        headers,
        ...(method === "PATCH" ? { data: { title: "Stolen" } } : {}),
      });
      expect(response.status()).toBe(404);
      expect(absent.status()).toBe(404);
      expect(await response.json()).toEqual(await absent.json());
    }
    const massAssignment = await stranger.post("/api/notes", {
      headers,
      data: { title: "Injected owner", userId: "someone-else" },
    });
    expect(massAssignment.status()).toBe(422);
    const reassignment = await request.patch(`/api/notes/${note.id}`, {
      headers,
      data: { userId: "someone-else" },
    });
    expect(reassignment.status()).toBe(422);
    expect(
      (await (await request.get(`/api/notes/${note.id}`)).json()).data.title,
    ).toBe("Private");
  } finally {
    await stranger.dispose();
  }
});

test("Notes rejects invalid bodies, IDs, pagination, and unsafe mutation origins", async ({
  request,
}) => {
  await signUp(request);
  const invalidJson = await request.post("/api/notes", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: Buffer.from("{"),
  });
  expect(invalidJson.status()).toBe(400);
  expect((await invalidJson.json()).error.code).toBe("INVALID_JSON");
  expect(
    (
      await request.post("/api/notes", {
        headers: { ...headers, "Content-Type": "text/plain" },
        data: "text",
      })
    ).status(),
  ).toBe(415);
  for (const data of [
    {},
    { title: "   " },
    { title: "x".repeat(161) },
    { title: "Valid", content: "x".repeat(10_001) },
    { title: "Valid", unexpected: true },
  ]) {
    const response = await request.post("/api/notes", { headers, data });
    expect(response.status()).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  }
  expect((await request.get("/api/notes/not-a-uuid")).status()).toBe(422);
  expect(
    (
      await request.patch(`/api/notes/${randomUUID()}`, { headers, data: {} })
    ).status(),
  ).toBe(422);
  for (const query of ["limit=101", "limit=0", "offset=-1", "limit=abc"]) {
    expect((await request.get(`/api/notes?${query}`)).status()).toBe(422);
  }
  const invalidOrigins: Record<string, string>[] = [
    { Origin: "https://untrusted.example" },
    { Origin: "null" },
    {},
    { ...headers, "Sec-Fetch-Site": "cross-site" },
  ];
  for (const requestHeaders of invalidOrigins) {
    const response = await request.post("/api/notes", {
      headers: requestHeaders,
      data: { title: "Should not save" },
    });
    expect(response.status()).toBe(403);
  }
  expect((await (await request.get("/api/notes")).json()).data).toEqual([]);
});

test("a revoked Better Auth cookie cannot be replayed against the Notes API", async ({
  request,
}) => {
  await signUp(request);
  const state = await request.storageState();
  const cookie = state.cookies
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  expect(cookie).toContain("session_token");
  expect(
    (await request.post("/api/auth/sign-out", { headers, data: {} })).status(),
  ).toBe(200);
  const replay = await request.get("/api/notes", {
    headers: { Cookie: cookie },
  });
  expect(replay.status()).toBe(401);
});
