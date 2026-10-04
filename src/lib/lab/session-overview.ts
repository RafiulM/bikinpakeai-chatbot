import {
  DECISIONS,
  FRUSTRATION_LEVELS,
  ISSUE_TYPES,
  URGENCIES,
  type JevSignal,
  type JevTally,
} from "./types.ts";

// Counts Jev's readings for the session history: per conversation on each
// session card, and across every matching conversation in the overview.
// Shared by the API (which groups rows in SQL) and the UI (which labels them).

/** Same cut-offs as Jev's own "Frustrasi" and "Risiko churn" labels. */
export const FRUSTRATION_CUTOFF = { tinggi: 0.75, sedang: 0.4 } as const;
export const CHURN_SIGNAL = 0.7;

/** One distinct combination of Jev readings and how many messages had it. */
export interface JevTallyRow {
  count: number;
  issueType: string | null;
  urgency: string | null;
  product: string | null;
  emotion: string | null;
  decision: string | null;
  sensitiveData: boolean;
  injection: boolean;
  churnRisk: boolean;
  refund: boolean;
}

export function emptyTally(): JevTally {
  return {
    analyzed: 0,
    intents: {},
    emotions: {},
    urgencies: {},
    products: {},
    decisions: {},
    signals: { sensitiveData: 0, injection: 0, churnRisk: 0, refund: 0 },
  };
}

function bump<K extends string>(
  counts: Partial<Record<K, number>>,
  allowed: readonly K[],
  key: string | null,
  by: number,
) {
  if (key === null || !(allowed as readonly string[]).includes(key)) return;
  counts[key as K] = (counts[key as K] ?? 0) + by;
}

/** Adds grouped rows to a tally and returns it. */
export function addToTally(tally: JevTally, rows: JevTallyRow[]): JevTally {
  for (const row of rows) {
    const n = row.count;
    if (n <= 0) continue;
    tally.analyzed += n;
    bump(tally.intents, ISSUE_TYPES, row.issueType, n);
    bump(tally.emotions, FRUSTRATION_LEVELS, row.emotion, n);
    bump(tally.urgencies, URGENCIES, row.urgency, n);
    bump(tally.decisions, DECISIONS, row.decision, n);
    const product = row.product?.trim();
    if (product) tally.products[product] = (tally.products[product] ?? 0) + n;
    if (row.sensitiveData) tally.signals.sensitiveData += n;
    if (row.injection) tally.signals.injection += n;
    if (row.churnRisk) tally.signals.churnRisk += n;
    if (row.refund) tally.signals.refund += n;
  }
  return tally;
}

export const tallyJev = (rows: JevTallyRow[]) => addToTally(emptyTally(), rows);

/** The most severe level that occurred, given levels from mild to severe. */
export function peakLevel<K extends string>(
  order: readonly K[],
  counts: Partial<Record<K, number>>,
): K | null {
  for (let index = order.length - 1; index >= 0; index -= 1)
    if (counts[order[index]]) return order[index];
  return null;
}

/** Non-zero entries, most frequent first; ties keep their given order. */
export function ranked<K extends string>(
  counts: Partial<Record<K, number>>,
): [K, number][] {
  return (Object.entries(counts) as [K, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
}

/** Share of the analyzed messages, as a whole percent. */
export function percentOf(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export const SIGNAL_LABEL: Record<JevSignal, string> = {
  sensitiveData: "Data sensitif",
  injection: "Prompt injection",
  churnRisk: "Risiko churn tinggi",
  refund: "Minta refund",
};

export const LEVEL_LABEL: Record<string, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  mendesak: "Mendesak",
};
