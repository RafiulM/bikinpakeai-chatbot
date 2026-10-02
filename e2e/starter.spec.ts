import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";

// Covers the starter's blank canvas only. Delete this file together with the
// placeholder in the signed-in app page once your first screen replaces it.
test("the placeholder app page greets the account and its prompt can be copied", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const email = `starter-${Date.now()}@example.com`;
  // Sign up through the API: the form is covered by auth.spec.ts, and the real
  // auth server rate-limits the rapid signups the other specs already made.
  const data = {
    name: "Ada Builder",
    email,
    password: "A-long-test-password-123!",
  };
  const headers = { Origin: "http://localhost:3101" };
  let response = await page.request.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((Math.min(seconds, 10) + 0.1) * 1000);
    response = await page.request.post("/api/auth/sign-up/email", {
      headers,
      data,
    });
  }
  expect(response.status()).toBe(200);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Ada Builder." }),
  ).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.locator("[data-starter-placeholder]")).toBeVisible();
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Read AGENTS.md",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
