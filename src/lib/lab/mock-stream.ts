import type { LabStream, LabStreamEvent } from "./stream-events";
import { turnDelta } from "./compare";
import type {
  BotResponse,
  ConversationTurn,
  Decision,
  HandlerRoute,
  JevAnalysis,
} from "./types";

// Offline stand-in for the server's event stream. After a message is sent it
// replays what the real pipeline reports: Jev's reading, then the baseline
// answer, then the comparison. Rules here are rough keyword guesses, marked
// as sample data; the real classification comes from the backend.

type Listener = (event: LabStreamEvent) => void;
const listeners = new Map<string, Set<Listener>>();

function emit(conversationId: string, event: LabStreamEvent) {
  for (const listener of listeners.get(conversationId) ?? []) listener(event);
}

export function createMockStream(conversationId: string): LabStream {
  return {
    subscribe(listener) {
      const set = listeners.get(conversationId) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(conversationId, set);
      return () => set.delete(listener);
    },
  };
}

function guess(text: string): {
  decision: Decision;
  route: HandlerRoute;
  routeLabel: string;
  reason: string;
  sensitive: boolean;
  injection: boolean;
  frustration: number;
} {
  const lower = text.toLowerCase();
  if (text.includes("••••"))
    return {
      decision: "masked",
      route: "template",
      routeLabel: "Template keamanan data",
      reason: "Nomor kartu terdeteksi dan disamarkan sebelum diproses.",
      sensitive: true,
      injection: false,
      frustration: 0.35,
    };
  if (/abaikan|ignore|system prompt/.test(lower))
    return {
      decision: "blocked",
      route: "template",
      routeLabel: "Template penolakan",
      reason: "Upaya prompt injection diblokir dan dicatat.",
      sensitive: false,
      injection: true,
      frustration: 0.2,
    };
  if (/refund|kecewa|marah|batal/.test(lower))
    return {
      decision: "escalated",
      route: "escalate",
      routeLabel: "Eskalasi ke tim support",
      reason: "Frustrasi atau permintaan refund perlu ditangani manusia.",
      sensitive: false,
      injection: false,
      frustration: 0.82,
    };
  if (/error|gagal|tidak bisa|bug/.test(lower))
    return {
      decision: "answered",
      route: "reasoning_model",
      routeLabel: "Model penalaran",
      reason: "Masalah teknis butuh penalaran langkah demi langkah.",
      sensitive: false,
      injection: false,
      frustration: 0.45,
    };
  return {
    decision: "answered",
    route: "fast_model",
    routeLabel: "Model cepat + FAQ & dokumentasi",
    reason: "Pertanyaan umum yang jawabannya ada di FAQ dan dokumentasi.",
    sensitive: false,
    injection: false,
    frustration: 0.25,
  };
}

function sampleAnalysis(messageId: string, text: string): JevAnalysis {
  const g = guess(text);
  const percent = (value: number) =>
    value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return {
    messageId,
    product: "Bikinpakeai",
    issueType:
      g.route === "reasoning_model"
        ? "bug"
        : g.sensitive
          ? "pembayaran"
          : "cara_pakai",
    urgency: g.decision === "escalated" ? "mendesak" : "sedang",
    frustrationScore: g.frustration,
    churnRisk: g.frustration * 0.8,
    sensitiveData: g.sensitive,
    injectionDetected: g.injection,
    confidence: 0.8,
    labels: [
      { label: "Produk", value: "Bikinpakeai", confidence: 0.74 },
      {
        label: "Frustrasi",
        value: percent(g.frustration),
        confidence: 0.82,
        flagged: g.frustration > 0.75,
      },
      {
        label: "Data sensitif",
        value: g.sensitive ? "Ya" : "Tidak ada",
        confidence: 0.95,
        flagged: g.sensitive,
      },
      {
        label: "Prompt injection",
        value: g.injection ? "Terdeteksi" : "Tidak ada",
        confidence: 0.93,
        flagged: g.injection,
      },
    ],
    decision: g.decision,
    route: g.route,
    routeLabel: g.routeLabel,
    routeReason: `${g.reason} (Data contoh dari stream tiruan.)`,
    rules:
      g.decision === "answered"
        ? ["Tidak ada aturan khusus yang terpicu"]
        : [g.reason],
    steps: [
      { name: "Klasifikasi", note: "1 panggilan Jev", durationMs: 200 },
      {
        name: "Aturan backend",
        note:
          g.decision === "answered" ? "Tidak ada tindakan" : "Aturan terpicu",
        durationMs: 20,
      },
      { name: "Penangan", note: g.routeLabel, durationMs: 480 },
      { name: "Verifikasi draf", note: "Lolos", durationMs: 80 },
    ],
  };
}

/** Plays the pipeline events for a freshly sent mock message. */
export function playMockPipeline(
  conversationId: string,
  turn: ConversationTurn,
) {
  const messageId = turn.message.id;
  const timers = [
    setTimeout(() => {
      emit(conversationId, {
        type: "analysis",
        messageId,
        analysis: sampleAnalysis(messageId, turn.message.content),
        ticketId:
          guess(turn.message.content).decision === "escalated"
            ? `T-${messageId.slice(-3)}`
            : null,
      });
    }, 600),
    setTimeout(() => {
      const baseline: BotResponse = {
        id: `${messageId}-base`,
        messageId,
        mode: "without_jev",
        content:
          "Terima kasih telah menghubungi kami! (Data contoh) Jawaban model pembanding tanpa Jev muncul di sini setelah backend tersambung.",
        latencyMs: 2600,
        costUsd: 0.0058,
        isVerified: false,
        review: {
          verdict: "correct",
          verdictLabel: "Tepat, tapi umum",
          issues: [],
        },
      };
      emit(conversationId, { type: "answer", messageId, response: baseline });
      emit(conversationId, {
        type: "comparison",
        messageId,
        delta: turnDelta({ ...turn, withoutJev: baseline }),
      });
    }, 2200),
  ];
  return () => timers.forEach(clearTimeout);
}
