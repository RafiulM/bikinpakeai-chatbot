import { expect, test } from "@playwright/test";

test("the readiness probe reports a reachable database without a session", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", database: true });
});
