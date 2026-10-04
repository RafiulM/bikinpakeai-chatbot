import test from "node:test";
import assert from "node:assert/strict";
import { jevAnalysisSchema, jevRunMetaSchema } from "../src/validators/jev.ts";

const valid = {
  product: "DesainPakeAI",
  issueType: "pembayaran",
  urgency: "mendesak",
  frustrationScore: 0.86,
  churnRisk: 0.78,
  sensitiveData: false,
  injectionDetected: false,
  confidence: 0.91,
  labels: [{ label: "Produk", value: "DesainPakeAI", confidence: 0.93 }],
  decision: "escalated",
  route: "escalate",
  routeLabel: "Eskalasi ke tim support",
  routeReason: "Frustrasi tinggi dan permintaan refund.",
  rules: ["Frustrasi 0,86 melewati ambang 0,75"],
  steps: [{ name: "Klasifikasi", note: "1 panggilan Jev", durationMs: 220 }],
};

test("a well-formed Jev reading passes and unknown keys are dropped", () => {
  const parsed = jevAnalysisSchema.parse({ ...valid, systemPrompt: "bocor" });
  assert.equal(parsed.decision, "escalated");
  assert.equal("systemPrompt" in parsed, false);
});

test("model output outside the contract is rejected", () => {
  for (const broken of [
    { ...valid, frustrationScore: 1.4 },
    { ...valid, issueType: "lainnya" },
    { ...valid, route: "human" },
    { ...valid, labels: [{ label: "", value: "x", confidence: 0.5 }] },
    { ...valid, steps: [{ name: "x", note: "", durationMs: -1 }] },
    { ...valid, routeReason: "" },
  ]) {
    assert.equal(jevAnalysisSchema.safeParse(broken).success, false);
  }
});

test("run metadata defaults missing counters to zero", () => {
  assert.deepEqual(jevRunMetaSchema.parse({ modelId: null }), {
    modelId: null,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    costUsd: 0,
  });
});

const trace = {
  kind: "model",
  template: null,
  modelId: "deepseek/deepseek-v4.1-flash",
  reasoningTokens: 0,
  maxOutputTokens: 400,
  temperature: 0.2,
  policy: true,
  docScope: "relevant",
  docs: [
    {
      id: "membership-activation",
      product: "Membership",
      topic: "Aktivasi membership setelah bayar",
    },
  ],
  history: 1,
  maskedInput: false,
  inputTokens: 812,
  outputTokens: 96,
  latencyMs: 1240,
  costUsd: 0.0003,
  fallback: null,
};

test("a reading without a handler trace stores null", () => {
  assert.equal(jevAnalysisSchema.parse(valid).handler, null);
});

test("the handler trace keeps names and counts, never prompt text", () => {
  const parsed = jevAnalysisSchema.parse({
    ...valid,
    handler: { ...trace, instructions: "Kamu asisten…", prompt: "pesan" },
  });
  assert.deepEqual(parsed.handler, trace);
});

test("a malformed handler trace is rejected", () => {
  for (const handler of [
    { ...trace, kind: "human" },
    { ...trace, template: "custom" },
    { ...trace, docScope: "some" },
    { ...trace, inputTokens: -1 },
    { ...trace, temperature: 3 },
    { ...trace, docs: [{ id: "", product: "x", topic: "y" }] },
  ]) {
    assert.equal(
      jevAnalysisSchema.safeParse({ ...valid, handler }).success,
      false,
    );
  }
});
