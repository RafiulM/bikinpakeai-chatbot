import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// The real UI against the real API (local answer engine): chat, then the
// same conversation in Compare, Debug and Agent.

/** View shortcuts are ignored while typing, so leave the text box first. */
async function switchView(page: import("@playwright/test").Page, key: string) {
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.keyboard.press(key);
}

test("a customer question flows through every view", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("UI Tester");
  await page.getByLabel("Email").fill(`ui-${randomUUID()}@example.com`);
  await page.getByLabel("Password").fill("Ui-test-password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  const limited = page.getByText("Too many requests");
  const outcome = await Promise.race([
    page.waitForURL(/\/customer/, { timeout: 8000 }).then(() => "ok"),
    limited.waitFor({ state: "visible", timeout: 8000 }).then(() => "limited"),
  ]);
  if (outcome === "limited") {
    await page.waitForTimeout(10_500);
    await page.getByRole("button", { name: "Create account" }).click();
  }
  await expect(page).toHaveURL(/\/customer/);

  // An empty account starts with a greeting and quick questions.
  await expect(page.getByText("Halo! Saya asisten Bikinpakeai.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Cara upgrade ke membership Pro/ }),
  ).toBeVisible();

  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Sudah 3 hari begini, saya kecewa banget. Mau refund aja.");
  await box.press("Enter");
  await expect(
    page.getByText(/Diteruskan ke tim support · Tiket T-\d+/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\?c=[0-9a-f-]{36}/);

  // Compare shows both answers once the baseline arrives.
  await switchView(page, "3");
  await expect(page).toHaveURL(/\/compare\?c=/);
  await expect(
    page.getByRole("heading", { name: /Jev lebih tepat di 1 dari 1 pesan/ }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Tidak menyerahkan ke manusia")).toBeVisible();

  // Debug shows Jev's decision for the message.
  await switchView(page, "2");
  await expect(
    page.getByRole("tabpanel").getByText("Dieskalasi ke manusia").first(),
  ).toBeVisible();

  // The escalation is waiting in the Agent queue; a reply reaches the chat.
  await switchView(page, "4");
  await expect(page.getByText("1 tiket aktif")).toBeVisible();
  await page
    .getByLabel("Balas pelanggan")
    .fill("Halo, kami sedang mengecek invoice Anda.");
  await page.getByRole("button", { name: "Kirim balasan" }).click();
  await expect(page.getByText("Balasan terkirim ke pelanggan.")).toBeVisible();
  await switchView(page, "1");
  await expect(
    page.getByText("Halo, kami sedang mengecek invoice Anda."),
  ).toBeVisible();
});
