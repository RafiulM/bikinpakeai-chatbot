import type { Decision } from "./types";

// Local ticket briefing: turns the conversation and Jev's reading of each
// message into a few plain sentences an agent can scan in seconds.

export interface SummaryMessage {
  content: string;
  decision: Decision | null;
  issueType: string | null;
  refundRequested?: boolean;
  frustrationScore?: number | null;
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const NOTE: Partial<Record<Decision, string>> = {
  masked: "Sempat mengirim data sensitif (sudah disamarkan otomatis).",
  blocked:
    "Sempat mencoba prompt injection atau meminta promo di luar kebijakan (diblokir).",
  clarify: "Ada pesan yang kurang jelas dan perlu klarifikasi.",
};

/** Two to four short points, oldest context first, the escalated ask last. */
export function summarizeConversation(messagesInOrder: SummaryMessage[]) {
  if (messagesInOrder.length === 0) return [];
  const first = messagesInOrder[0];
  const last = messagesInOrder.at(-1)!;
  const points = [`Awal masalah: “${clip(first.content, 140)}”`];
  const notes = new Set<string>();
  for (const message of messagesInOrder.slice(0, -1)) {
    const note = message.decision && NOTE[message.decision];
    if (note) notes.add(note);
  }
  points.push(...notes);
  if (messagesInOrder.length > 1)
    points.push(`Pesan terakhir: “${clip(last.content, 140)}”`);
  const mood =
    (last.frustrationScore ?? 0) >= 0.75
      ? " dengan frustrasi tinggi"
      : (last.frustrationScore ?? 0) >= 0.4
        ? " dengan nada kesal"
        : "";
  if (last.refundRequested) points.push(`Sekarang meminta refund${mood}.`);
  else if (mood) points.push(`Pelanggan menulis${mood}.`);
  return points.slice(0, 5);
}
