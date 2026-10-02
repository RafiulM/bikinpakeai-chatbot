import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSummaryFile,
  summaryData,
} from "../src/lib/lab/summary-export.ts";

const exportedAt = new Date(Date.UTC(2026, 9, 3, 3, 0)).toISOString();

const answer = (mode, verdict, latencyMs, costUsd, flags = []) => ({
  id: `${mode}`,
  messageId: "m",
  mode,
  content: "x",
  latencyMs,
  costUsd,
  isVerified: true,
  review: { verdict, verdictLabel: verdict, issues: [], flags },
});

const conversation = {
  code: "#A-1001",
  title: "Kartu\ndan refund",
  turns: [
    {
      message: { id: "m-1", createdAt: exportedAt, content: "a" },
      withJev: answer("with_jev", "correct", 500, 0.0002),
      withoutJev: answer("without_jev", "wrong", 2500, 0.004, ["security"]),
    },
    {
      message: { id: "m-2", createdAt: exportedAt, content: "b" },
      withJev: answer("with_jev", "escalated", 500, 0.0002),
      withoutJev: answer("without_jev", "correct", 2500, 0.004),
    },
  ],
};

const outcome = (verdict) => ({ verdict, latencyMs: 400, costUsd: 0.001 });
const report = {
  runId: "r-1",
  runNumber: 7,
  testSetId: "s-1",
  testSetName: "Support umum",
  total: 2,
  status: "done",
  progress: 2,
  startedAt: exportedAt,
  finishedAt: exportedAt,
  withJev: {
    correct: 2,
    wrong: 0,
    escalated: 0,
    averageLatencyMs: 400,
    totalCostUsd: 0.002,
  },
  withoutJev: {
    correct: 1,
    wrong: 1,
    escalated: 0,
    averageLatencyMs: 2400,
    totalCostUsd: 0.01,
  },
  categories: [
    {
      id: "pembayaran",
      label: "Pembayaran",
      withJev: 1,
      withoutJev: 1,
      total: 1,
    },
    { id: "bug", label: "Bug", withJev: 1, withoutJev: 0, total: 1 },
  ],
  cases: [],
};

test("the summary combines the conversation and the latest test run", () => {
  const data = summaryData({ conversation, report, exportedAt });
  assert.equal(data.conversation.compared, 2);
  assert.deepEqual(
    [data.conversation.withJev.correct, data.conversation.withoutJev.correct],
    [2, 1],
  );
  assert.equal(data.conversation.withoutJev.securityIncidents, 1);
  assert.deepEqual(data.conversation.highlights, [
    "5× lebih cepat",
    "95% lebih hemat",
  ]);
  assert.equal(data.testRun.headline, "Jev unggul 50 poin: 100% lawan 50%.");
  assert.deepEqual(data.testRun.categories[1], {
    category: "Bug",
    messages: 1,
    withJevPercent: 100,
    withoutJevPercent: 0,
    gapPoints: 100,
  });
});

test("markdown and json files are named by conversation and day", () => {
  const md = buildSummaryFile({ conversation, report, exportedAt }, "markdown");
  assert.equal(md.fileName, "ringkasan-bikinpakeai-A-1001-2026-10-03.md");
  assert.equal(md.mimeType, "text/markdown");
  assert.ok(
    md.content.startsWith("# Ringkasan hasil · Bikinpakeai Support Lab"),
  );
  assert.ok(md.content.includes("## Percakapan #A-1001 · Kartu dan refund"));
  assert.ok(md.content.includes("| Ketepatan | 2/2 (100%) | 1/2 (50%) |"));
  assert.ok(
    md.content.includes("## Uji test set · Run #7 · Support umum · 2 pesan"),
  );
  assert.ok(md.content.includes("| Bug (1) | 100% | 0% |"));

  const json = buildSummaryFile(
    { report: null, conversation: null, exportedAt },
    "json",
  );
  assert.equal(json.fileName, "ringkasan-bikinpakeai-2026-10-03.json");
  assert.deepEqual(JSON.parse(json.content), {
    title: "Ringkasan hasil · Bikinpakeai Support Lab",
    exportedAt,
    conversation: null,
    testRun: null,
  });
});
