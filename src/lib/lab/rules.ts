import type {
  Decision,
  HandlerRoute,
  IssueType,
  LabelScore,
  Urgency,
} from "./types";

// Backend rules that turn Jev's reading into an action. Pure and shared by
// the pipeline and its tests, so every decision is explainable.

export interface Classification {
  product: string;
  issueType: IssueType;
  urgency: Urgency;
  frustrationScore: number;
  churnRisk: number;
  sensitiveData: boolean;
  injectionDetected: boolean;
  refundRequested: boolean;
  /** Probability that the message is too vague to answer. */
  unclear: number;
  /** How sure Jev is about which product the message is about. */
  productConfidence: number;
  confidence: number;
  labels: LabelScore[];
}

export const THRESHOLDS = {
  frustration: 0.75,
  churn: 0.7,
  unclear: 0.6,
  knownProduct: 0.6,
  minConfidence: 0.45,
} as const;

export interface RuleContext {
  /** Jev's previous reply in this conversation already asked to clarify. */
  justClarified?: boolean;
}

export interface RuleResult {
  decision: Decision;
  route: HandlerRoute;
  routeLabel: string;
  routeReason: string;
  rules: string[];
  /** True when a human ticket must be opened. */
  escalate: boolean;
}

const score = (value: number) =>
  value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Ordered rules: safety first, then hand-off, then clarity, then cost. */
export function applyRules(
  c: Classification,
  context: RuleContext = {},
): RuleResult {
  if (c.injectionDetected)
    return {
      decision: "blocked",
      route: "template",
      routeLabel: "Template penolakan",
      routeReason:
        "Pesan berisi upaya prompt injection. Permintaan diblokir, dicatat, lalu dibalas dengan template resmi tanpa memanggil model besar.",
      rules: ["Instruksi untuk mengabaikan aturan diblokir dan dicatat"],
      escalate: false,
    };

  const escalationReasons = [
    c.frustrationScore >= THRESHOLDS.frustration &&
      `Frustrasi ${score(c.frustrationScore)} melewati ambang ${score(THRESHOLDS.frustration)}`,
    c.churnRisk >= THRESHOLDS.churn &&
      `Risiko churn ${score(c.churnRisk)} melewati ambang ${score(THRESHOLDS.churn)}`,
    c.refundRequested && "Permintaan refund wajib ditangani manusia",
    c.urgency === "mendesak" &&
      c.issueType === "bug" &&
      "Bug mendesak perlu dicek langsung",
  ].filter((reason): reason is string => Boolean(reason));

  if (c.sensitiveData && escalationReasons.length === 0)
    return {
      decision: "masked",
      route: "template",
      routeLabel: "Template keamanan data",
      routeReason:
        "Data sensitif terdeteksi dan sudah disamarkan sebelum diteruskan ke model mana pun. Balasan memakai template keamanan yang meminta nomor invoice.",
      rules: [
        "Data sensitif disamarkan",
        "Data asli tidak disimpan di riwayat",
      ],
      escalate: false,
    };

  if (escalationReasons.length > 0)
    return {
      decision: "escalated",
      route: "escalate",
      routeLabel: "Eskalasi ke tim support",
      routeReason:
        "Kasus ini perlu keputusan manusia. Jev membuat tiket untuk tim support dan mengirim balasan empatik tanpa menjanjikan refund.",
      rules: [
        ...escalationReasons,
        ...(c.sensitiveData ? ["Data sensitif disamarkan"] : []),
      ],
      escalate: true,
    };

  // A vague message only needs a question back when Jev also cannot tell
  // which product it is about; otherwise the handler can answer it. Never
  // ask twice in a row: after one question, answer from the conversation.
  const vague =
    c.unclear >= THRESHOLDS.unclear &&
    c.productConfidence < THRESHOLDS.knownProduct;
  const unsure = c.confidence < THRESHOLDS.minConfidence;
  if ((vague || unsure) && !context.justClarified)
    return {
      decision: "clarify",
      route: "clarify",
      routeLabel: "Pertanyaan klarifikasi",
      routeReason:
        "Pesan kurang jelas dan produknya belum diketahui, atau keyakinan klasifikasi rendah, jadi Jev bertanya balik sebelum menjawab.",
      rules: [
        vague
          ? `Pesan kurang jelas (${score(c.unclear)}) dan produk belum diketahui (${score(c.productConfidence)})`
          : `Keyakinan ${score(c.confidence)} di bawah ${score(THRESHOLDS.minConfidence)}`,
      ],
      escalate: false,
    };
  const answerRules =
    vague || unsure
      ? [
          "Sudah bertanya balik sebelumnya, jadi Jev menjawab dari konteks percakapan",
        ]
      : ["Tidak ada aturan khusus yang terpicu"];

  if (c.issueType === "saran_fitur")
    return {
      decision: "answered",
      route: "template",
      routeLabel: "Template saran fitur",
      routeReason:
        "Saran fitur cukup dicatat dan diteruskan ke tim produk; tidak perlu model.",
      rules: ["Saran fitur dicatat untuk tim produk"],
      escalate: false,
    };

  if (c.issueType === "bug")
    return {
      decision: "answered",
      route: "reasoning_model",
      routeLabel: "Model penalaran",
      routeReason:
        "Masalah teknis butuh penalaran langkah demi langkah berdasarkan dokumentasi.",
      rules: answerRules,
      escalate: false,
    };

  return {
    decision: "answered",
    route: "fast_model",
    routeLabel: "Model cepat + FAQ & dokumentasi",
    routeReason:
      "Pertanyaan umum yang jawabannya ada di FAQ dan dokumentasi, jadi cukup model cepat.",
    rules: answerRules,
    escalate: false,
  };
}

const CARD = /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,4}\b/;
const PROMO_CODE = /\bkode\b[^.]{0,40}\b[A-Z0-9]{5,}\b|diskon\s+100\s*%/i;
const REFUND_PROMISE =
  /refund[^.]{0,60}(akan|sudah|segera)\s+(kami\s+)?(proses|diproses|kembali|dikembalikan)|dana\s+akan\s+kembali/i;
const SYSTEM_LEAK = /(system prompt|instruksi sistem|my instructions)/i;

export interface DraftCheck {
  ok: boolean;
  problems: string[];
  flags: ("security" | "policy")[];
}

/** Verifies a draft answer against the support policy before it is sent. */
export function checkDraft(draft: string): DraftCheck {
  const problems: string[] = [];
  const flags = new Set<"security" | "policy">();
  if (CARD.test(draft)) {
    problems.push("Mengulang nomor kartu");
    flags.add("security");
  }
  if (SYSTEM_LEAK.test(draft)) {
    problems.push("Mengungkap instruksi sistem");
    flags.add("security");
  }
  if (PROMO_CODE.test(draft)) {
    problems.push("Memberi promo di luar kebijakan");
    flags.add("policy");
  }
  if (REFUND_PROMISE.test(draft)) {
    problems.push("Menjanjikan refund di luar kebijakan");
    flags.add("policy");
  }
  return { ok: problems.length === 0, problems, flags: [...flags] };
}
