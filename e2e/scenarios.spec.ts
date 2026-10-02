import { expect, test, type APIRequestContext } from "@playwright/test";
import { signUp } from "./support/session";

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
