import test from "node:test";
import assert from "node:assert/strict";
import { applyRules, checkDraft } from "../src/lib/lab/rules.ts";
import {
  KNOWLEDGE,
  productKnowledge,
  searchKnowledge,
} from "../src/lib/lab/knowledge.ts";

const base = {
  product: "DesainPakeAI",
  issueType: "akses_akun",
  urgency: "sedang",
  frustrationScore: 0.3,
  churnRisk: 0.2,
  sensitiveData: false,
  injectionDetected: false,
  refundRequested: false,
  unclear: 0.1,
  productConfidence: 0.9,
  confidence: 0.9,
  labels: [],
};

test("injection is blocked before anything else", () => {
  const result = applyRules({
    ...base,
    injectionDetected: true,
    refundRequested: true,
  });
  assert.equal(result.decision, "blocked");
  assert.equal(result.route, "template");
  assert.equal(result.escalate, false);
});

test("sensitive data is masked unless the case also needs a human", () => {
  assert.equal(applyRules({ ...base, sensitiveData: true }).decision, "masked");
  const both = applyRules({
    ...base,
    sensitiveData: true,
    frustrationScore: 0.9,
  });
  assert.equal(both.decision, "escalated");
  assert.ok(both.rules.includes("Data sensitif disamarkan"));
});

test("frustration, churn and refund requests escalate with reasons", () => {
  const result = applyRules({
    ...base,
    frustrationScore: 0.86,
    churnRisk: 0.78,
    refundRequested: true,
  });
  assert.equal(result.decision, "escalated");
  assert.equal(result.escalate, true);
  assert.deepEqual(result.rules, [
    "Frustrasi 0,86 melewati ambang 0,75",
    "Risiko churn 0,78 melewati ambang 0,70",
    "Permintaan refund wajib ditangani manusia",
  ]);
});

test("vague or low-confidence messages get a clarifying question", () => {
  assert.equal(
    applyRules({ ...base, unclear: 0.7, productConfidence: 0.36 }).route,
    "clarify",
  );
  assert.equal(applyRules({ ...base, confidence: 0.3 }).route, "clarify");
});

test("a vague message about a known product is answered, not questioned", () => {
  // "Halo saya dapat bug pada saat generate PRD...": PRDTask at 0,99.
  const bug = applyRules({
    ...base,
    issueType: "bug",
    unclear: 0.74,
    productConfidence: 0.99,
  });
  assert.equal(bug.decision, "answered");
  assert.equal(bug.route, "reasoning_model");
});

test("Jev never asks to clarify twice in a row", () => {
  const vague = { ...base, unclear: 0.79, productConfidence: 0.36 };
  const again = applyRules(vague, { justClarified: true });
  assert.equal(again.decision, "answered");
  assert.equal(again.route, "fast_model");
  assert.match(again.rules[0], /Sudah bertanya balik/);
  assert.equal(
    applyRules({ ...base, injectionDetected: true }, { justClarified: true })
      .decision,
    "blocked",
  );
});

test("routing picks the cheapest suitable handler", () => {
  assert.equal(applyRules(base).route, "fast_model");
  assert.equal(
    applyRules({ ...base, issueType: "bug" }).route,
    "reasoning_model",
  );
  assert.equal(
    applyRules({ ...base, issueType: "saran_fitur" }).route,
    "template",
  );
});

test("draft verification catches leaks and promises outside policy", () => {
  assert.deepEqual(
    checkDraft("Saya sudah menerima nomor kartu 4111 1111 1111 1111.").flags,
    ["security"],
  );
  assert.deepEqual(
    checkDraft("Tentu! Gunakan kode PROMO100 untuk diskon 100%.").flags,
    ["policy"],
  );
  assert.equal(
    checkDraft("Refund Anda akan kami proses dalam 3 hari kerja.").problems[0],
    "Menjanjikan refund di luar kebijakan",
  );
  assert.equal(
    checkDraft("Nomor kartu sudah saya samarkan: 4111 •••• •••• 1111.").ok,
    true,
  );
  assert.equal(
    checkDraft("Kasus Anda sudah diteruskan ke tim support.").ok,
    true,
  );
});

test("knowledge search ranks entries by keyword overlap", () => {
  const [first] = searchKnowledge("Saya lupa password akun PRDTask");
  assert.equal(first.id, "prdtask-password");
  assert.deepEqual(searchKnowledge("halo"), []);
});

test("the product Jev read decides ties between products", () => {
  const text = "Kuota saya habis padahal baru awal bulan";
  assert.equal(searchKnowledge(text, 3, "AndalAI")[0].id, "andalai-kuota");
  assert.equal(searchKnowledge(text, 3, "PRDTask")[0].id, "prdtask-kuota");
});

test("the product fallback is a small, single-product slice", () => {
  const entries = productKnowledge("Komunitas");
  assert.ok(entries.length > 0);
  assert.ok(entries.every((entry) => entry.product === "Komunitas"));
  assert.ok(entries.length * 4 < KNOWLEDGE.length);
  assert.equal(
    new Set(KNOWLEDGE.map((entry) => entry.id)).size,
    KNOWLEDGE.length,
  );
});

test("answers are judged against the same expectation", async () => {
  const { reviewAnswer } = await import("../src/lib/lab/review.ts");
  const escalate = { decision: "escalated", escalate: true };
  const good = reviewAnswer(
    "with_jev",
    "Maaf ya. Kasus Anda sudah saya teruskan ke tim support.",
    escalate,
  );
  assert.equal(good.verdict, "escalated");
  assert.equal(
    good.highlight,
    "Kasus Anda sudah saya teruskan ke tim support.",
  );

  const bad = reviewAnswer(
    "without_jev",
    "Mohon maaf. Refund Anda akan kami proses dalam 3 hari kerja.",
    escalate,
  );
  assert.equal(bad.verdict, "wrong");
  assert.deepEqual(bad.issues, [
    "Menjanjikan refund di luar kebijakan",
    "Tidak menyerahkan ke manusia",
  ]);
  assert.deepEqual(bad.flags.sort(), ["missed_escalation", "policy"]);
  assert.equal(
    bad.highlight,
    "Refund Anda akan kami proses dalam 3 hari kerja.",
  );

  const leak = reviewAnswer(
    "without_jev",
    "Terima kasih, kartu 4111 1111 1111 1111 sudah diterima.",
    { decision: "masked", escalate: false },
  );
  assert.deepEqual(leak.flags, ["security"]);

  assert.equal(
    reviewAnswer("with_jev", "Promo resmi ada di halaman Harga.", {
      decision: "blocked",
      escalate: false,
    }).verdictLabel,
    "Tepat · diblokir",
  );
});
