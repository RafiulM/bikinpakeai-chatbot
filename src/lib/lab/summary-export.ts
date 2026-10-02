// Explicit .ts extensions: this pure module also runs directly under Node tests.
import {
  conversationHeadline,
  ratioText,
  summarize,
  type ModeTotals,
} from "./compare.ts";
import {
  dayKey,
  formatClock,
  formatDay,
  formatSeconds,
  formatUsd,
} from "./format.ts";
import { compareScores } from "./test-report.ts";
import type { LabConversation, TestRunReport } from "./types.ts";

// One compact file with the comparison results: the active conversation's
// cumulative totals and the latest mass test. Pure, so the browser download
// and a server export produce the same file.

export type SummaryFormat = "markdown" | "json";

export interface SummaryInput {
  conversation?: Pick<LabConversation, "code" | "title" | "turns"> | null;
  report?: TestRunReport | null;
  exportedAt?: string;
}

const percent = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

function conversationPart(
  conversation: NonNullable<SummaryInput["conversation"]>,
) {
  const summary = summarize(conversation.turns);
  const side = (totals: ModeTotals) => ({
    correct: totals.correct,
    answered: totals.answered,
    accuracyPercent: percent(totals.correct, totals.answered),
    totalLatencyMs: totals.latencyMs,
    totalCostUsd: Number(totals.costUsd.toFixed(6)),
    securityIncidents: totals.security,
    policyBreaks: totals.policy,
    missedEscalations: totals.missedEscalation,
  });
  return {
    code: conversation.code,
    title: conversation.title,
    messages: conversation.turns.length,
    compared: summary.compared,
    headline:
      summary.compared > 0
        ? conversationHeadline(summary)
        : "Belum ada pesan yang dijawab dua jalur.",
    highlights: [
      ratioText(
        summary.withJev.latencyMs,
        summary.withoutJev.latencyMs,
        "speed",
      ),
      ratioText(summary.withJev.costUsd, summary.withoutJev.costUsd, "cost"),
    ].filter((item): item is string => item !== null),
    withJev: side(summary.withJev),
    withoutJev: side(summary.withoutJev),
  };
}

function testPart(report: TestRunReport) {
  const comparison = compareScores(report);
  const side = (version: typeof comparison.withJev) => ({
    scorePercent: version.score,
    correct: version.correct,
    wrong: version.wrong,
    escalated: version.escalated,
    averageLatencyMs: version.averageLatencyMs,
    totalCostUsd: Number(version.totalCostUsd.toFixed(6)),
  });
  return {
    runNumber: report.runNumber,
    testSetName: report.testSetName,
    status: report.status,
    messages: report.total,
    finishedAt: report.finishedAt,
    headline: comparison.headline,
    highlights: comparison.highlights,
    gapPoints: comparison.gapPoints,
    withJev: side(comparison.withJev),
    withoutJev: side(comparison.withoutJev),
    categories: comparison.categories.map((item) => ({
      category: item.label,
      messages: item.total,
      withJevPercent: item.withJev,
      withoutJevPercent: item.withoutJev,
      gapPoints: item.gapPoints,
    })),
  };
}

/** The summary as a plain object; also the JSON file's content. */
export function summaryData(input: SummaryInput) {
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  return {
    title: "Ringkasan hasil · Bikinpakeai Support Lab",
    exportedAt,
    conversation: input.conversation
      ? conversationPart(input.conversation)
      : null,
    testRun: input.report ? testPart(input.report) : null,
  };
}

type Row = [label: string, withJev: string, withoutJev: string];

function table(rows: Row[], head = ["", "Dengan Jev", "Tanpa Jev"]) {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    line(head),
    line(head.map(() => "---")),
    ...rows.map((row) => line(row)),
  ].join("\n");
}

function markdown(data: ReturnType<typeof summaryData>) {
  const parts = [
    `# ${data.title}`,
    `_Jev vs tanpa Jev · ${formatDay(data.exportedAt)} ${formatClock(data.exportedAt)} WIB_`,
  ];
  const sentence = (headline: string, highlights: string[]) =>
    highlights.length
      ? `${headline} Untuk pesan dan knowledge base yang sama, versi dengan Jev ${highlights.join(", ")}.`
      : headline;

  const { conversation, testRun } = data;
  if (conversation) {
    const { withJev: jev, withoutJev: base } = conversation;
    parts.push(
      `## Percakapan ${conversation.code} · ${conversation.title.replace(/\s+/g, " ")}`,
      sentence(conversation.headline, conversation.highlights),
      table([
        [
          "Ketepatan",
          `${jev.correct}/${jev.answered} (${jev.accuracyPercent}%)`,
          `${base.correct}/${base.answered} (${base.accuracyPercent}%)`,
        ],
        [
          "Total waktu",
          formatSeconds(jev.totalLatencyMs),
          formatSeconds(base.totalLatencyMs),
        ],
        [
          "Total biaya",
          formatUsd(jev.totalCostUsd),
          formatUsd(base.totalCostUsd),
        ],
        [
          "Insiden keamanan",
          String(jev.securityIncidents),
          String(base.securityIncidents),
        ],
        [
          "Di luar kebijakan",
          String(jev.policyBreaks),
          String(base.policyBreaks),
        ],
        [
          "Eskalasi terlewat",
          String(jev.missedEscalations),
          String(base.missedEscalations),
        ],
      ]),
    );
  }
  if (testRun) {
    const { withJev: jev, withoutJev: base } = testRun;
    parts.push(
      `## Uji test set · Run #${testRun.runNumber} · ${testRun.testSetName} · ${testRun.messages} pesan`,
      sentence(testRun.headline, testRun.highlights),
      table([
        ["Skor akhir", `${jev.scorePercent}%`, `${base.scorePercent}%`],
        ["Benar", String(jev.correct), String(base.correct)],
        ["Salah", String(jev.wrong), String(base.wrong)],
        ["Dieskalasi", String(jev.escalated), String(base.escalated)],
        [
          "Rata-rata waktu",
          formatSeconds(jev.averageLatencyMs),
          formatSeconds(base.averageLatencyMs),
        ],
        [
          "Total biaya",
          formatUsd(jev.totalCostUsd, 3),
          formatUsd(base.totalCostUsd, 3),
        ],
      ]),
      "Skor akhir menghitung jawaban benar ditambah penyerahan ke tim support yang tepat.",
    );
    if (testRun.categories.length > 0)
      parts.push(
        "### Skor per kategori",
        table(
          testRun.categories.map((item) => [
            `${item.category} (${item.messages})`,
            `${item.withJevPercent}%`,
            `${item.withoutJevPercent}%`,
          ]),
          ["Kategori (pesan)", "Dengan Jev", "Tanpa Jev"],
        ),
      );
  }
  if (!conversation && !testRun) parts.push("Belum ada hasil untuk diringkas.");
  return parts.join("\n\n") + "\n";
}

/** File name, MIME type, and content of the summary download. */
export function buildSummaryFile(input: SummaryInput, format: SummaryFormat) {
  const data = summaryData(input);
  const day = dayKey(data.exportedAt);
  const code = input.conversation?.code.replace(/[^A-Za-z0-9-]/g, "") ?? "";
  const name = ["ringkasan-bikinpakeai", code, day].filter(Boolean).join("-");
  return format === "json"
    ? {
        fileName: `${name}.json`,
        mimeType: "application/json",
        content: JSON.stringify(data, null, 2) + "\n",
      }
    : {
        fileName: `${name}.md`,
        mimeType: "text/markdown",
        content: markdown(data),
      };
}
