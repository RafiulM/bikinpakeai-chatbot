// Explicit .ts extensions: this pure module also runs directly under Node tests.
import { sortTurns } from "./conversation.ts";
import { formatClock, formatDay, formatSeconds, formatUsd } from "./format.ts";
import type { BotResponse, ConversationTurn, LabConversation } from "./types";

// Plain-text transcript of one conversation with Jev's reading of every
// message, ready to paste into a document or chat. Pure, so the browser copy
// and a server export produce exactly the same text. Message text is already
// masked where sensitive data was found.

const percent = (value: number) => `${Math.round(value * 100)}%`;

export interface TranscriptOptions {
  /** When the transcript was made; shown in its header. */
  exportedAt?: string;
  /** Plain text for chat, Markdown for documents. Defaults to text. */
  format?: "text" | "markdown";
  /** Every label with its confidence, or only the key and flagged ones. */
  labels?: "full" | "brief";
  /** Include the answer without Jev next to Jev's. Defaults to true. */
  includeBaseline?: boolean;
}

type Line = [label: string, value: string];

function answerValue(response: BotResponse | null) {
  if (!response) return "(belum ada jawaban)";
  const { review } = response;
  const verdict = review.issues.length
    ? `${review.verdictLabel}: ${review.issues.join(", ")}`
    : review.verdictLabel;
  const meta = [
    verdict,
    formatSeconds(response.latencyMs),
    formatUsd(response.costUsd),
  ].join(" · ");
  return `[${meta}] ${response.content}`;
}

const KEY_LABELS = new Set(["Produk", "Jenis masalah"]);

function jevLines(turn: ConversationTurn, brief: boolean): Line[] {
  if (turn.analysis) {
    const labels = turn.analysis.labels
      .filter((item) => !brief || KEY_LABELS.has(item.label) || item.flagged)
      .map((item) =>
        brief
          ? `${KEY_LABELS.has(item.label) ? item.value : `${item.label} ${item.value}`}${item.flagged ? " ⚑" : ""}`
          : `${item.label} ${item.value} (${percent(item.confidence)})${item.flagged ? " ⚑" : ""}`,
      )
      .join(" · ");
    return [
      ["Label Jev", labels],
      [
        "Keputusan Jev",
        brief
          ? turn.analysis.routeLabel
          : `${turn.analysis.routeLabel} — ${turn.analysis.routeReason}`,
      ],
    ];
  }
  if (turn.analysisStatus === "failed")
    return [
      [
        "Label Jev",
        `gagal dibaca${turn.analysisError ? ` (${turn.analysisError})` : ""}`,
      ],
    ];
  return [["Label Jev", "belum tersedia"]];
}

/**
 * The whole conversation as labelled text, oldest message first. Messages
 * still being sent are left out.
 */
export function buildTranscript(
  conversation: Pick<LabConversation, "code" | "title" | "turns">,
  options: TranscriptOptions = {},
) {
  const markdown = options.format === "markdown";
  const brief = options.labels === "brief";
  const includeBaseline = options.includeBaseline ?? true;
  const turns = sortTurns(conversation.turns).filter(
    (turn) => !turn.deliveryStatus,
  );
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  // Markdown list items must stay on one line.
  const oneLine = (text: string) =>
    markdown ? text.replace(/\s*\n\s*/g, " ") : text;
  const render = ([label, value]: Line) =>
    markdown ? `- **${label}:** ${oneLine(value)}` : `${label}: ${value}`;

  const title = `Transkrip ${conversation.code} · ${conversation.title}`;
  const subtitle = `Bikinpakeai Support Lab · Jev vs tanpa Jev · ${formatDay(exportedAt)} ${formatClock(exportedAt)} WIB · ${turns.length} pesan pelanggan`;
  const header = markdown
    ? `# ${oneLine(title)}\n\n_${subtitle}_`
    : `${title}\n${subtitle}`;

  const blocks = turns.map((turn, index) => {
    const heading = `Pesan ${index + 1} · ${formatClock(turn.message.createdAt)}`;
    const lines: Line[] = [
      ["Pelanggan", turn.message.content],
      ...jevLines(turn, brief),
      ["Dengan Jev", answerValue(turn.withJev)],
    ];
    if (includeBaseline)
      lines.push(["Tanpa Jev", answerValue(turn.withoutJev)]);
    if (turn.ticketId) lines.push(["Tiket", turn.ticketId]);
    for (const reply of turn.agentReplies ?? [])
      lines.push([
        `Tim support (${reply.agentName}, ${formatClock(reply.createdAt)})`,
        reply.content,
      ]);
    return [
      markdown ? `## ${heading}` : `— ${heading} —`,
      ...(markdown ? [""] : []),
      ...lines.map(render),
    ].join("\n");
  });
  return [header, ...blocks].join("\n\n") + "\n";
}
