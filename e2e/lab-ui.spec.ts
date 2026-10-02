import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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

/** Creates an account through the real form; lands on the Customer view. */
async function signUpInBrowser(
  page: import("@playwright/test").Page,
  prefix: string,
) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("UI Tester");
  await page.getByLabel("Email").fill(`${prefix}-${randomUUID()}@example.com`);
  await page.getByLabel("Password").fill("Ui-test-password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  const limited = page.getByText("Too many requests");
  const outcome = await Promise.race([
    page.waitForURL(/\/customer/, { timeout: 8000 }).then(() => "ok"),
    limited.waitFor({ state: "visible", timeout: 8000 }).then(() => "limited"),
  ]);
  if (outcome === "limited") {
    // The real auth server limits rapid signups. Honor its retry window once.
    await page.waitForTimeout(10_500);
    await page.getByRole("button", { name: "Create account" }).click();
  }
  await expect(page).toHaveURL(/\/customer/);
}

test("a customer question flows through every view", async ({ page }) => {
  await signUpInBrowser(page, "ui");

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

test("a mass test runs from the Uji Test Set screen and fills the report", async ({
  page,
}) => {
  await signUpInBrowser(page, "ui-set");

  await page.goto("/test-set");
  await expect(
    page.getByText("Belum ada laporan. Pilih test set lalu jalankan uji."),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Eskalasi & frustrasi/ }).check();
  await page.getByRole("button", { name: "Jalankan uji" }).click();
  await expect(
    page.getByText("Uji selesai: 50 pesan diproses. Laporan hasil diperbarui."),
  ).toBeVisible();
  await expect(
    page.getByText(/Run #\d+ · Eskalasi & frustrasi · 50 pesan/),
  ).toBeVisible();
  await expect(
    page.getByText("50 dari 50 pesan", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByText(/Kesimpulan · Semua kategori · 50 pesan/i),
  ).toBeVisible();

  // The report survives a reload: it comes from the server, not the page.
  await page.reload();
  await expect(
    page.getByText(/Run #\d+ · Eskalasi & frustrasi · 50 pesan/),
  ).toBeVisible();
});

test("results are copied, downloaded and recorded from Ekspor & Rekap", async ({
  page,
  context,
}) => {
  await signUpInBrowser(page, "ui-export");
  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Bagaimana cara ekspor PRD dari PRDTask ke PDF?");
  await box.press("Enter");
  // The compare link appears once both answers are stored.
  await expect(page.getByRole("link", { name: "Bandingkan" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: "Ekspor & Rekap" }).click();
  await expect(page).toHaveURL(/\/ekspor\?c=/);
  const preview = page.getByLabel("Pratinjau transkrip");
  await expect(preview).toContainText(
    "Pelanggan: Bagaimana cara ekspor PRD dari PRDTask ke PDF?",
  );
  await expect(preview).toContainText("Label Jev: Produk");

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Salin transkrip" }).click();
  await expect(
    page.getByText(/Transkrip 1 pesan beserta label Jev tersalin/),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Pelanggan: Bagaimana cara ekspor PRD dari PRDTask ke PDF?",
  );

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh ringkasan" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^ringkasan-bikinpakeai-A-\d+-\d{4}-\d{2}-\d{2}\.md$/,
  );
  const summary = readFileSync(await download.path(), "utf8");
  expect(summary).toContain("## Percakapan #A-");
  expect(summary).toContain("| Ketepatan |");
  await expect(page.getByText(/Ringkasan tersimpan sebagai/)).toBeVisible();

  // Recording mode hides the navigation, follows view switches, and Esc ends it.
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await page.getByRole("switch", { name: /Mode rekaman/ }).click();
  await expect(page).toHaveURL(/rekam=1/);
  await expect(nav).toHaveCount(0);
  await switchView(page, "3");
  await expect(page).toHaveURL(/\/compare\?.*rekam=1/);
  await expect(
    page.getByRole("button", { name: "Sorot perbedaan" }),
  ).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(nav).toBeVisible();
  await expect(page).not.toHaveURL(/rekam=1/);
});
