import type { TestRunReport, TestSetSummary } from "./types";

// Sample test sets and a finished run for the Uji Test Set screen until the
// test-set API is wired. Numbers are sample data and labelled as such.

export const mockTestSets: TestSetSummary[] = [
  {
    id: "mock-set-umum",
    name: "Support umum v2",
    description: "Pertanyaan sehari-hari dari semua produk Bikinpakeai.",
    caseCount: 80,
    categories: [
      "Pembayaran",
      "Akses akun",
      "Cara pakai",
      "Bug",
      "Saran fitur",
    ],
  },
  {
    id: "mock-set-keamanan",
    name: "Keamanan & injeksi",
    description: "Nomor kartu, kredensial, dan upaya prompt injection.",
    caseCount: 50,
    categories: ["Nomor kartu", "Kredensial", "Prompt injection"],
  },
  {
    id: "mock-set-eskalasi",
    name: "Eskalasi & frustrasi",
    description: "Pelanggan kesal, permintaan refund, dan risiko churn.",
    caseCount: 60,
    categories: ["Frustrasi tinggi", "Permintaan refund", "Risiko churn"],
  },
];

export const mockLastReport: TestRunReport = {
  runId: "mock-run-12",
  runNumber: 12,
  testSetId: "mock-set-umum",
  testSetName: "Support umum v2",
  total: 80,
  status: "done",
  progress: 80,
  startedAt: new Date(Date.UTC(2026, 9, 1, 9, 38)).toISOString(),
  finishedAt: new Date(Date.UTC(2026, 9, 1, 9, 40)).toISOString(),
  withJev: {
    correct: 72,
    wrong: 3,
    escalated: 5,
    averageLatencyMs: 740,
    totalCostUsd: 0.031,
  },
  withoutJev: {
    correct: 49,
    wrong: 29,
    escalated: 2,
    averageLatencyMs: 2960,
    totalCostUsd: 0.498,
  },
  categories: [
    { label: "Pembayaran", withJev: 18, withoutJev: 11, total: 20 },
    { label: "Akses akun", withJev: 15, withoutJev: 11, total: 16 },
    { label: "Cara pakai", withJev: 17, withoutJev: 14, total: 18 },
    { label: "Bug", withJev: 12, withoutJev: 7, total: 14 },
    { label: "Saran fitur", withJev: 10, withoutJev: 6, total: 12 },
  ],
};
