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

export type ReviewFlag = "security" | "policy" | "missed_escalation";

export interface ResponseReview {
  verdict: Verdict;
  /** Short label shown next to the verdict, e.g. "Tepat, tapi umum". */
  verdictLabel: string;
  issues: string[];
  /** Exact substring of the response to highlight. */
  highlight?: string;
  /** Whether the highlight marks a strength or a problem. Defaults from the verdict. */
  highlightTone?: "good" | "bad";
  /** Problem categories counted in the cumulative summary. */
  flags?: ReviewFlag[];
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
  /** "pending" while Jev reads the message, "failed" when it could not. */
  analysisStatus?: "pending" | "failed";
  /** Short, user-safe reason shown when the analysis failed. */
  analysisError?: string;
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
  /** Last view opened for this conversation. */
  activeView?: ViewId;
  turns: ConversationTurn[];
}

export const TICKET_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const TICKET_STATUSES = ["open", "claimed", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketReply {
  id: string;
  ticketId: string;
  agentName: string;
  content: string;
  createdAt: string;
}

export interface TicketExcerptLine {
  sender: "customer" | "bot" | "agent";
  label: string;
  content: string;
  createdAt: string;
}

/** A conversation escalated to the human support team (Agent view). */
export interface SupportTicket {
  id: string;
  code: string;
  conversationId: string;
  conversationCode: string;
  messageId: string;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  claimedBy: string | null;
  product: string;
  issueLabel: string;
  frustrationScore: number;
  churnRisk: number;
  /** One-line summary for the queue. */
  summary: string;
  /** Jev's short briefing for the agent. */
  summaryPoints: string[];
  nextStep: string;
  escalationReason: string;
  excerpt: TicketExcerptLine[];
  replies: TicketReply[];
  createdAt: string;
}

export interface TestSetSummary {
  id: string;
  name: string;
  description: string;
  caseCount: number;
  /** Categories covered, for the picker's subtitle. */
  categories: string[];
  /** Shared sample set; false for an upload owned by the account. */
  builtIn?: boolean;
}

export type TestRunStatus = "running" | "done" | "failed" | "cancelled";

export interface VerdictTally {
  correct: number;
  wrong: number;
  escalated: number;
}

export interface TestRunReport {
  runId: string;
  runNumber: number;
  testSetId: string;
  testSetName: string;
  total: number;
  status: TestRunStatus;
  progress: number;
  startedAt: string;
  finishedAt: string | null;
  withJev: VerdictTally & { averageLatencyMs: number; totalCostUsd: number };
  withoutJev: VerdictTally & { averageLatencyMs: number; totalCostUsd: number };
  /** Correct answers per issue category, for the report's category filter. */
  categories: {
    id: IssueType;
    label: string;
    withJev: number;
    withoutJev: number;
    total: number;
  }[];
  /** Per-message outcomes, in test-set order, when loaded. */
  cases?: TestCaseResult[];
}

/** How one chatbot version handled one test message. */
export interface TestCaseOutcome {
  verdict: Verdict;
  latencyMs: number;
  costUsd: number;
}

export interface TestCaseResult {
  caseId: string;
  /** Issue category the message belongs to, for filtering the report. */
  category: IssueType;
  inputText: string;
  expectedLabel: string;
  withJev: TestCaseOutcome;
  withoutJev: TestCaseOutcome;
}
