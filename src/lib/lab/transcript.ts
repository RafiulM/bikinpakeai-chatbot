// Explicit .ts extensions: this pure module also runs directly under Node tests.
import { sortTurns } from "./conversation.ts";
import { formatClock, formatDay, formatSeconds, formatUsd } from "./format.ts";
import type { BotResponse, ConversationTurn, LabConversation } from "./types";

// Plain-text transcript of one conversation with Jev's reading of every
// message, ready to paste into a document or chat. Pure, so the browser copy
// and a server export produce exactly the same text. Message text is already
// masked where sensitive data was found.

const percent = (value: number) => `${Math.round(value * 100)}%`;

function answerLine(name: string, response: BotResponse | null) {
  if (!response) return `${name}: (belum ada jawaban)`;
  const { review } = response;
  const verdict = review.issues.length
    ? `${review.verdictLabel}: ${review.issues.join(", ")}`
    : review.verdictLabel;
  const meta = [
    verdict,
    formatSeconds(response.latencyMs),
    formatUsd(response.costUsd),
  ].join(" · ");
  return `${name} [${meta}]: ${response.content}`;
}

function jevLines(turn: ConversationTurn) {
  if (turn.analysis) {
    const labels = turn.analysis.labels
      .map(
        (item) =>
          `${item.label} ${item.value} (${percent(item.confidence)})${item.flagged ? " ⚑" : ""}`,
      )
      .join(" · ");
    return [
      `Label Jev: ${labels}`,
      `Keputusan Jev: ${turn.analysis.routeLabel} — ${turn.analysis.routeReason}`,
    ];
  }
  if (turn.analysisStatus === "failed")
    return [
      `Label Jev: gagal dibaca${turn.analysisError ? ` (${turn.analysisError})` : ""}`,
    ];
  return ["Label Jev: belum tersedia"];
}

export interface TranscriptOptions {
  /** When the transcript was made; shown in its header. */
  exportedAt?: string;
}

/** The whole conversation as labelled plain text, oldest message first. */
export function buildTranscript(
  conversation: Pick<LabConversation, "code" | "title" | "turns">,
  options: TranscriptOptions = {},
) {
  const turns = sortTurns(conversation.turns).filter(
    (turn) => !turn.deliveryStatus,
  );
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const header = [
    `Transkrip ${conversation.code} · ${conversation.title}`,
    `Bikinpakeai Support Lab · Jev vs tanpa Jev · ${formatDay(exportedAt)} ${formatClock(exportedAt)} WIB`,
    `${turns.length} pesan pelanggan`,
  ];
  const blocks = turns.map((turn, index) => {
    const lines = [
      `— Pesan ${index + 1} · ${formatClock(turn.message.createdAt)} —`,
      `Pelanggan: ${turn.message.content}`,
      ...jevLines(turn),
      answerLine("Dengan Jev", turn.withJev),
      answerLine("Tanpa Jev", turn.withoutJev),
    ];
    if (turn.ticketId) lines.push(`Tiket: ${turn.ticketId}`);
    for (const reply of turn.agentReplies ?? [])
      lines.push(
        `Tim support (${reply.agentName}, ${formatClock(reply.createdAt)}): ${reply.content}`,
      );
    return lines.join("\n");
  });
  return [header.join("\n"), ...blocks].join("\n\n") + "\n";
}
