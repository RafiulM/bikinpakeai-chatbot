import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// The real UI against the real API (local answer engine): chat with both
// answers side by side, then the same conversation in Debug.

/** View shortcuts are ignored while typing, so leave the text box first. */
async function switchView(page: import("@playwright/test").Page, key: string) {
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await page.keyboard.press(key);
}

/** Creates an account through the real form; lands on the Chat view. */
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
    page.waitForURL(/\/compare/, { timeout: 8000 }).then(() => "ok"),
    limited.waitFor({ state: "visible", timeout: 8000 }).then(() => "limited"),
  ]);
  if (outcome === "limited") {
    // The real auth server limits rapid signups. Honor its retry window once.
    await page.waitForTimeout(10_500);
    await page.getByRole("button", { name: "Create account" }).click();
  }
  await expect(page).toHaveURL(/\/compare/);
}

test("a customer question flows through every view", async ({ page }) => {
  await signUpInBrowser(page, "ui");

  // An empty account starts with quick questions.
  await expect(
    page.getByRole("heading", { name: "Satu pertanyaan, dua jawaban." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Cara upgrade ke membership Pro/ }),
  ).toBeVisible();

  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Sudah 3 hari begini, saya kecewa banget. Mau refund aja.");
  await box.press("Enter");
  await expect(page.getByText(/Diteruskan ke support · T-\d+/)).toBeVisible();
  await expect(page).toHaveURL(/\?c=[0-9a-f-]{36}/);

  // Both answers sit side by side once the baseline arrives, each signed
  // with who wrote it instead of column titles.
  await expect(page.getByText("Tidak menyerahkan ke manusia")).toBeVisible({
    timeout: 15_000,
  });
  const withJev = page.getByRole("region", { name: "Jawaban dengan Jev" });
  const withoutJev = page.getByRole("region", { name: "Jawaban tanpa Jev" });
  await expect(withJev).toContainText("Dengan Jev · template");
  await expect(withJev).toContainText("Dieskalasi tepat");
  await expect(withoutJev).toContainText("Tanpa Jev · mode lokal");
  await expect(withoutJev).toContainText("Salah");

  // Debug shows Jev's decision for the message.
  await switchView(page, "2");
  await expect(
    page.getByRole("tabpanel").getByText("Dieskalasi ke manusia").first(),
  ).toBeVisible();
});

test("finished sessions stay saved for Debug review from Riwayat Sesi", async ({
  page,
}) => {
  await signUpInBrowser(page, "ui-history");
  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Sudah 3 hari begini, saya kecewa banget. Mau refund aja.");
  await box.press("Enter");
  await expect(page.getByText(/Diteruskan ke support · T-\d+/)).toBeVisible();
  await expect(page).toHaveURL(/\?c=[0-9a-f-]{36}/);
  const savedId = new URL(page.url()).searchParams.get("c")!;

  // A new conversation ends the first one. After a reload only the new one
  // is open in the browser; the first lives on the server only.
  await page.getByRole("button", { name: "Percakapan baru" }).click();
  await page.getByRole("button", { name: "Mulai baru" }).click();
  await expect(page).not.toHaveURL(new RegExp(savedId));
  await page.reload();

  await page.getByRole("link", { name: "Riwayat Sesi" }).click();
  const saved = page
    .getByRole("listitem")
    .filter({ hasText: "Mau refund aja" });
  await expect(saved).toContainText("Selesai");
  await expect(saved).toContainText("1 tiket");
  await expect(saved).toContainText("Dieskalasi 1");
  // Jev's reading of the session, and of all sessions in the overview.
  await expect(saved).toContainText("Intent");
  await expect(saved).toContainText("Emosi");
  const overview = page.getByRole("region", { name: "Ringkasan Jev" });
  await expect(overview).toContainText("2 sesi · 1 pesan dibaca Jev");
  for (const panel of [
    "Intent · jenis masalah",
    "Emosi · tingkat frustrasi",
    "Urgensi",
    "Sinyal risiko",
  ])
    await expect(overview.getByRole("region", { name: panel })).toBeVisible();
  await saved.getByRole("link", { name: "Review Debug" }).click();
  await expect(page).toHaveURL(new RegExp(`/debug\\?c=${savedId}`));
  await expect(page.getByRole("button", { name: /Sesi #A-\d+/ })).toContainText(
    "Selesai",
  );
  await expect(
    page.getByRole("tabpanel").getByText("Dieskalasi ke manusia").first(),
  ).toBeVisible();

  // In Chat the saved session is read-only, with a way back.
  await switchView(page, "1");
  await expect(page.getByText(/Sesi #A-\d+ sudah selesai\./)).toBeVisible();
  await expect(page.getByLabel("Pertanyaan Anda")).toHaveCount(0);
  await page.getByRole("button", { name: "Kembali ke chat aktif" }).click();
  await expect(page.getByLabel("Pertanyaan Anda")).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(savedId));
});

test("recording mode starts from Pengaturan and follows view switches", async ({
  page,
}) => {
  await signUpInBrowser(page, "ui-record");
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(nav.getByRole("link", { name: "Chat" })).toBeVisible();
  for (const removed of ["Agent", "Skenario", "Uji Test Set", "Ekspor & Rekap"])
    await expect(
      nav.getByRole("link", { name: removed, exact: true }),
    ).toHaveCount(0);

  // Recording mode hides the navigation, follows view switches, and Esc ends it.
  await page.getByRole("link", { name: "Pengaturan" }).first().click();
  await page.getByRole("switch", { name: /Mode rekaman/ }).click();
  await expect(page).toHaveURL(/rekam=1/);
  await expect(nav).toHaveCount(0);
  await switchView(page, "1");
  await expect(page).toHaveURL(/\/compare\?.*rekam=1/);
  await expect(
    page.getByRole("button", { name: "Percakapan baru" }),
  ).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(nav).toBeVisible();
  await expect(page).not.toHaveURL(/rekam=1/);
});

test("with demo mode off, Chat is one chatbot with or without Jev", async ({
  page,
}) => {
  await signUpInBrowser(page, "ui-real");
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });

  await page.goto("/pengaturan");
  const demoSwitch = page.getByRole("switch", { name: "Mode demo" });
  await expect(demoSwitch).toHaveAttribute("aria-checked", "true");
  await demoSwitch.click();
  await expect(demoSwitch).toHaveAttribute("aria-checked", "false");
  await expect(nav).toHaveCount(0);
  await page.getByRole("radio", { name: "Tanpa Jev" }).check();
  await expect(
    page.getByText("Mode demo mati. Chat menampilkan chatbot tanpa jev."),
  ).toBeVisible();

  // Without Jev: one reply, no review, totals, or handover to support.
  await page.getByRole("link", { name: "Buka Chat" }).click();
  await expect(
    page.getByRole("heading", { name: "Halo, ada yang bisa kami bantu?" }),
  ).toBeVisible();
  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Sudah 3 hari begini, saya kecewa banget. Mau refund aja.");
  await box.press("Enter");
  const reply = page.getByRole("region", {
    name: "Balasan Asisten Bikinpakeai",
  });
  await expect(reply).toBeVisible();
  await expect(reply.getByText("Menunggu jawaban…")).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(reply).not.toContainText("Maaf, asisten belum bisa menjawab");
  await expect(page.getByRole("region", { name: /^Jawaban / })).toHaveCount(0);
  await expect(page.getByText(/Diteruskan ke/)).toHaveCount(0);
  await expect(page.getByText("Tidak menyerahkan ke manusia")).toHaveCount(0);

  // The lab view shortcuts are off, and the layout survives a reload.
  await switchView(page, "2");
  await expect(page).toHaveURL(/\/compare/);
  await page.reload();
  await expect(reply).toBeVisible();
  await expect(nav).toHaveCount(0);

  // With Jev: the same message shows Jev's answer and its handover.
  await page.getByRole("link", { name: "Pengaturan" }).click();
  await page.getByRole("radio", { name: "Dengan Jev" }).check();
  await expect(
    page.getByText("Mode demo mati. Chat menampilkan chatbot dengan jev."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Buka Chat" }).click();
  await expect(
    page.getByText(/Diteruskan ke tim support · tiket T-\d+/),
  ).toBeVisible();

  // Demo mode on again: both answers side by side with the lab menu.
  await page.getByRole("link", { name: "Pengaturan" }).click();
  await demoSwitch.click();
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Chat", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Jawaban tanpa Jev" }).first(),
  ).toContainText("Salah");
});

test("Konfigurasi Agent shows the documents the support agent answers from", async ({
  page,
}) => {
  await signUpInBrowser(page, "ui-config");
  const box = page.getByLabel("Pertanyaan Anda");
  await box.fill("Bagaimana cara ekspor PRD dari PRDTask ke PDF?");
  await box.press("Enter");
  await expect(page).toHaveURL(/\?c=[0-9a-f-]{36}/);

  // Debug links each document the handler was given to that document.
  await switchView(page, "2");
  const chip = page.locator('a[href*="/konfigurasi"][href*="doc="]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  const href = (await chip.getAttribute("href"))!;
  const id = new URL(href, "http://lab.test").searchParams.get("doc")!;
  await chip.click();
  await expect(page).toHaveURL(new RegExp(`/konfigurasi\\?.*doc=${id}`));
  await expect(page.getByRole("tab", { name: /^Dokumen/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(`[data-doc-detail="${id}"]`)).toBeVisible();
  const linked = page.locator(`[data-doc="${id}"] button`);
  await expect(linked).toHaveAttribute("aria-current", "true");
  await expect(linked).toBeInViewport();

  // Picking another document opens it and keeps it in the address.
  const docs = page.locator("li[data-doc]");
  const total = await docs.count();
  expect(total).toBeGreaterThan(10);
  const other = docs.filter({ hasNot: page.locator("[aria-current]") }).first();
  const otherId = (await other.getAttribute("data-doc"))!;
  await other.getByRole("button").click();
  await expect(page).toHaveURL(new RegExp(`doc=${otherId}`));
  await expect(page.locator(`[data-doc-detail="${otherId}"]`)).toBeVisible();

  // Search and the product filter narrow the list.
  const search = page.getByLabel("Cari dokumen");
  await search.fill("refund");
  await expect(docs).not.toHaveCount(total);
  await expect(page.locator("[data-doc-detail]")).toContainText(/refund/i);
  await search.fill("tidak-ada-dokumen-seperti-ini");
  await expect(docs).toHaveCount(0);
  await expect(page.getByText("Tidak ada dokumen yang cocok")).toBeVisible();
  await search.fill("");
  await page.getByRole("radio", { name: /^Komunitas/ }).check();
  await expect(
    page.getByRole("region", { name: "Dokumen Komunitas" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Dokumen Umum" })).toHaveCount(
    0,
  );

  // The instructions mark where the policy and the documents go, per path.
  await page.getByRole("tab", { name: "Instruksi" }).click();
  await expect(page).toHaveURL(/tab=instruksi/);
  const instructions = page.getByLabel(/^Instruksi sistem /);
  await expect(instructions).toContainText(/Kebijakan support · \d+ aturan/);
  await expect(instructions).toContainText("Maks. 3 dokumen yang cocok");
  await page.getByRole("radio", { name: "Tanpa Jev" }).check();
  await expect(instructions).toContainText(/Semua \d+ dokumen/);
  // A slot opens the tab it stands for.
  await instructions.getByRole("link", { name: /Kebijakan support/ }).click();
  await expect(page.getByRole("tab", { name: /^Kebijakan/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel")).toContainText(
    "Refund hanya boleh diputuskan",
  );

  // The open tab survives a reload.
  await page.getByRole("tab", { name: "Model" }).click();
  await expect(page.getByText(/^Mode lokal: belum ada kunci/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Model" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
