// Shared shapes for the Support Lab screens. The frontend renders these from
// mock data first; the backend API returns exactly the same JSON later, so the
// screens do not change when real data arrives.

export const VIEW_IDS = ["customer", "debug", "compare", "agent"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export const ISSUE_TYPES = [
  "pembayaran",
  "akses_akun",
  "cara_pakai",
  "bug",
  "saran_fitur",
] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const HANDLER_ROUTES = [
  "template",
  "fast_model",
  "reasoning_model",
  "escalate",
  "clarify",
] as const;
export type HandlerRoute = (typeof HANDLER_ROUTES)[number];

export type Urgency = "rendah" | "sedang" | "tinggi" | "mendesak";
export type ResponseMode = "with_jev" | "without_jev";
export type Verdict = "correct" | "wrong" | "escalated";
export type Decision =
  "answered" | "masked" | "blocked" | "escalated" | "clarify";

export interface LabMessage {
  id: string;
  conversationId: string;
  sender: "customer" | "agent";
  /** Already masked when sensitive data was detected. */
  content: string;
  isMasked: boolean;
  createdAt: string;
}

export interface LabelScore {
  label: string;
  value: string;
  /** 0–1 confidence for this label. */
  confidence: number;
  /** Marks a value that triggered a backend rule. */
  flagged?: boolean;
}

export interface PipelineStep {
  name: string;
  note: string;
  durationMs: number;
}

export interface JevAnalysis {
  messageId: string;
  product: string;
  issueType: IssueType;
  urgency: Urgency;
  frustrationScore: number;
  churnRisk: number;
  sensitiveData: boolean;
  injectionDetected: boolean;
  /** Overall classification confidence, 0–1. */
  confidence: number;
  labels: LabelScore[];
  decision: Decision;
  route: HandlerRoute;
  routeLabel: string;
  routeReason: string;
  rules: string[];
  steps: PipelineStep[];
}

export interface ResponseReview {
  verdict: Verdict;
  /** Short label shown next to the verdict, e.g. "Tepat, tapi umum". */
  verdictLabel: string;
  issues: string[];
  /** Exact substring of the response to highlight. */
  highlight?: string;
}

export interface BotResponse {
  id: string;
  messageId: string;
  mode: ResponseMode;
  content: string;
  latencyMs: number;
  costUsd: number;
  isVerified: boolean;
  review: ResponseReview;
}

export interface AgentReply {
  id: string;
  ticketId: string;
  agentName: string;
  content: string;
  createdAt: string;
}

export interface ConversationTurn {
  message: LabMessage;
  analysis: JevAnalysis | null;
  withJev: BotResponse | null;
  withoutJev: BotResponse | null;
  ticketId: string | null;
  /** Human replies sent from the Agent view for this turn's ticket. */
  agentReplies?: AgentReply[];
  /** Client-only: delivery state while the message is in flight. */
  deliveryStatus?: "sending" | "failed";
  /** One-line takeaway for the comparison row. */
  takeaway?: string;
}

export interface LabConversation {
  id: string;
  code: string;
  title: string;
  status: "active" | "ended";
  createdAt: string;
  turns: ConversationTurn[];
}
