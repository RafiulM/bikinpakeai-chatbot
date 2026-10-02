import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `roles-${randomUUID()}@example.com`,
    password: "Roles-test-password-123!",
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
  return data.email;
}

// Roles are granted out of band, the way npm run role:set does it.
async function setRole(email: string, role: string | null) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  } finally {
    await pool.end();
  }
}

test("admin endpoints answer 401 without a session, not 403", async ({
  request,
}) => {
  for (const [method, url] of [
    ["GET", "/api/admin/notes"],
    ["DELETE", `/api/admin/notes/${randomUUID()}`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in to continue." },
    });
  }
});

test("the default role cannot reach another account's notes", async ({
  request,
}) => {
  await signUp(request, "Default Role");
  const create = await request.post("/api/notes", {
    headers,
    data: { title: "Only mine" },
  });
  expect(create.status()).toBe(201);

  for (const [method, url] of [
    ["GET", "/api/admin/notes"],
    ["DELETE", `/api/admin/notes/${randomUUID()}`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  }
});

test("a granted role reaches every account, and losing it revokes access", async ({
  browser,
  request,
}) => {
  // One ordinary account with a note nobody else should see.
  const ownerContext = await browser.newContext();
  const owner = ownerContext.request;
  await signUp(owner, "Note Owner");
  const created = await owner.post("/api/notes", {
    headers,
    data: { title: "Owned by someone else" },
  });
  expect(created.status()).toBe(201);
  const noteId = (await created.json()).data.id;

  const adminEmail = await signUp(request, "Role Holder");
  expect((await request.get("/api/admin/notes", { headers })).status()).toBe(
    403,
  );

  await setRole(adminEmail, "admin");

  // The check reads the stored role, so the existing session is enough.
  const listed = await request.get("/api/admin/notes", { headers });
  expect(listed.status()).toBe(200);
  const body = await listed.json();
  expect(
    body.data.some(
      (note: { id: string; ownerEmail: string }) => note.id === noteId,
    ),
  ).toBe(true);
  expect(body.data[0]).toHaveProperty("ownerEmail");

  // Cross-account deletes still require the configured Origin.
  const wrongOrigin = await request.delete(`/api/admin/notes/${noteId}`, {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(wrongOrigin.status()).toBe(403);
  expect((await wrongOrigin.json()).error.code).toBe("FORBIDDEN_ORIGIN");

  const removed = await request.delete(`/api/admin/notes/${noteId}`, {
    headers,
  });
  expect(removed.status()).toBe(204);
  expect(
    (await (await owner.get("/api/notes", { headers })).json()).data,
  ).toEqual([]);
  expect(
    (await request.delete(`/api/admin/notes/${noteId}`, { headers })).status(),
  ).toBe(404);

  await setRole(adminEmail, "user");
  expect((await request.get("/api/admin/notes", { headers })).status()).toBe(
    403,
  );
  await ownerContext.close();
});

test("the admin page renders only for a permitted role", async ({ page }) => {
  const email = `roles-${randomUUID()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Page Viewer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Roles-test-password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/admin");
  await expect(page.getByText("Every account’s notes")).toHaveCount(0);

  await setRole(email, "admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Every account’s notes" }),
  ).toBeVisible();
});
