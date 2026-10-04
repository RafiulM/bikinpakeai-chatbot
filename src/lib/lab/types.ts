// Shared shapes for the Support Lab screens. The frontend renders these from
// mock data first; the backend API returns exactly the same JSON later, so the
// screens do not change when real data arrives.

import type { KnowledgeEntry } from "./knowledge";

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

export type Urgency = (typeof URGENCIES)[number];
export type ResponseMode = "with_jev" | "without_jev";
export type Verdict = "correct" | "wrong" | "escalated";
export const DECISIONS = [
  "answered",
  "masked",
  "blocked",
  "escalated",
  "clarify",
] as const;
export type Decision = (typeof DECISIONS)[number];

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
  /** The single classification call; absent on readings from older builds. */
  reader?: ModelRun | null;
  /** What the chosen handler used; absent on readings from older builds. */
  handler?: HandlerTrace | null;
}

/** One model call: which model, how many tokens, how long, how much. */
export interface ModelRun {
  modelId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
}

export const TEMPLATE_IDS = [
  "blocked",
  "masked",
  "escalated",
  "clarify",
  "feature",
  "safeFallback",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** A knowledge-base entry handed to a model, without its answer text. */
export interface ContextDoc {
  id: string;
  product: string;
  topic: string;
}

/**
 * What the handler the rules picked was given before it answered. Holds
 * names and counts only, never the instructions or customer text.
 */
export interface HandlerContext {
  /** A fixed template, an OpenRouter model, or the keyless local engine. */
  kind: "template" | "model" | "local";
  template: TemplateId | null;
  modelId: string | null;
  /** Thinking tokens allowed on top of the answer; 0 when reasoning is off. */
  reasoningTokens: number;
  maxOutputTokens: number | null;
  temperature: number | null;
  /** Whether the support policy was part of the instructions. */
  policy: boolean;
  /**
   * "relevant": matching entries only; "product": nothing matched, so only
   * the entries of the product Jev read; "all": not even that, so all.
   */
  docScope: "relevant" | "product" | "all" | "none";
  docs: ContextDoc[];
  /** Earlier exchanges of the conversation sent along with the message. */
  history: number;
}

export interface HandlerTrace extends HandlerContext {
  /** Whether the customer text was masked before the handler saw it. */
  maskedInput: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  /** Why the safe template replaced the handler's draft, if it did. */
  fallback: string | null;
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
  /** Model that wrote the final answer; null for a fixed template. */
  modelId?: string | null;
  /** Every model call of the path: Jev's reading plus the handler. */
  inputTokens?: number;
  outputTokens?: number;
  /** Knowledge entries sent along; null on answers stored before counting. */
  docCount?: number | null;
  review: ResponseReview;
}

/** An answer path that produced no answer, with a user-safe reason. */
export interface AnswerFailure {
  mode: ResponseMode;
  error: string;
  /** Model it tried, when a model was called. */
  modelId: string | null;
  latencyMs: number;
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
  /** Answer paths that failed for this message, without an answer. */
  answerFailures?: Partial<Record<ResponseMode, AnswerFailure>>;
  /** Client-only: delivery state while the message is in flight. */
  deliveryStatus?: "sending" | "failed";
  /** One-line takeaway for the comparison row. */
  takeaway?: string;
}

/** One earlier exchange, given to the models so a follow-up reads in context. */
export interface PriorExchange {
  /** The customer's message as stored (masked). */
  customer: string;
  /** What this answer path replied, or null when it has no answer. */
  reply: string | null;
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

/** A saved conversation in the session history, without its turns. */
export interface ConversationListItem extends Omit<LabConversation, "turns"> {
  messageCount: number;
  /** When the newest message arrived; null for an empty conversation. */
  lastMessageAt: string | null;
  /** How Jev read this conversation's messages, counted per message. */
  jev: JevTally;
  /** Messages Jev could not read or one of the paths could not answer. */
  failures: number;
  tickets: number;
}

export const URGENCIES = ["rendah", "sedang", "tinggi", "mendesak"] as const;
export const FRUSTRATION_LEVELS = ["rendah", "sedang", "tinggi"] as const;
export type FrustrationLevel = (typeof FRUSTRATION_LEVELS)[number];

/** Risk signals Jev raises per message, besides the labels above. */
export const JEV_SIGNALS = [
  "sensitiveData",
  "injection",
  "churnRisk",
  "refund",
] as const;
export type JevSignal = (typeof JEV_SIGNALS)[number];

/** Jev's readings of a set of customer messages, counted per message. */
export interface JevTally {
  /** Customer messages Jev read successfully. */
  analyzed: number;
  /** Issue type (the customer's intent). */
  intents: Partial<Record<IssueType, number>>;
  /** Frustration level, Jev's reading of the customer's emotion. */
  emotions: Partial<Record<FrustrationLevel, number>>;
  urgencies: Partial<Record<Urgency, number>>;
  products: Record<string, number>;
  decisions: Partial<Record<Decision, number>>;
  /** Messages that raised each risk signal. */
  signals: Record<JevSignal, number>;
}

/** Jev's readings across every saved conversation matching a filter. */
export interface SessionOverview extends JevTally {
  sessions: number;
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

/** Live state of one mass test run, as the API and its stream report it. */
export interface TestRunState {
  runId: string;
  runNumber: number;
  testSetId: string;
  testSetName: string;
  status: TestRunStatus;
  processed: number;
  total: number;
  withJev: VerdictTally;
  withoutJev: VerdictTally;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

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
  /** Right answers (correct or handed off) per issue category. */
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
  /** Issue category for filtering the report: the case's own, else Jev's reading. */
  category: IssueType | null;
  inputText: string;
  expectedLabel: string;
  withJev: TestCaseOutcome;
  withoutJev: TestCaseOutcome;
}

/** Where the OpenRouter key for an account's work comes from. */
export type OpenRouterKeySource = "account" | "server" | "none";

/** AI settings as the Pengaturan screen sees them; never the key itself. */
export interface AiSettings {
  source: OpenRouterKeySource;
  /** The account's saved key, shown only by its last characters. */
  accountKey: { hint: string; updatedAt: string } | null;
  /** A saved key that can no longer be decrypted (server secret changed). */
  accountKeyUnreadable: boolean;
  serverKey: boolean;
  models: { jev: string; fast: string; reasoning: string; baseline: string };
}

/**
 * The customer-support agent's setup as the Konfigurasi screen shows it: the
 * same models, instructions, policy and knowledge the pipeline sends.
 */
export interface AgentConfig {
  source: OpenRouterKeySource;
  models: AiSettings["models"];
  answer: {
    maxOutputTokens: number;
    temperature: number;
    /** Thinking tokens the reasoning model gets on top of the answer. */
    reasoningTokens: number;
    /** Most knowledge entries a Jev handler gets when keywords match. */
    docLimit: number;
  };
  /**
   * System instructions per path, with {{kebijakan}} and {{dokumentasi}}
   * where the policy and the knowledge entries go.
   */
  instructions: Record<ResponseMode, string>;
  policy: string[];
  knowledge: KnowledgeEntry[];
  /** Fixed replies; {{kode tiket}} marks the ticket code. */
  templates: { id: TemplateId; text: string }[];
}

/**
 * How Chat looks for the account. With demo mode off it shows one chatbot,
 * the chosen path, the way a customer would see it.
 */
export interface DisplaySettings {
  demoMode: boolean;
  chatbot: ResponseMode;
}

export type OpenRouterKeyCheck =
  | { status: "none" }
  | {
      status: "ok";
      source: OpenRouterKeySource;
      label: string | null;
      usageUsd: number;
      limitRemainingUsd: number | null;
      freeTier: boolean;
    }
  | { status: "rejected" | "unreachable"; source: OpenRouterKeySource };

/** What "Isi data demo" made for the account. */
export interface DemoSeedResult {
  conversation: { id: string; code: string };
  messages: number;
  tickets: number;
  failed: number;
  /** Built-in test sets now running one after another in the background. */
  testSets: string[];
}
