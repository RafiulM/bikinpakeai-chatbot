import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  max,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/index.server";
import {
  answerFailures,
  conversations,
  jevAnalyses,
  messages,
  responses,
  tickets,
} from "@/db/schema";
import { maskSensitive } from "@/lib/lab/mask";
import {
  addToTally,
  CHURN_SIGNAL,
  emptyTally,
  FRUSTRATION_CUTOFF,
  tallyJev,
} from "@/lib/lab/session-overview";
import { toJevAnalysis } from "./jev.service.server";
import { likePattern, ticketsForMessages } from "./tickets.service.server";
import { VIEW_IDS, type ViewId } from "@/lib/lab/types";
import type {
  BotResponse,
  ConversationListItem,
  ConversationTurn,
  LabConversation,
  LabMessage,
  SessionOverview,
} from "@/lib/lab/types";

type AnswerFailures = NonNullable<ConversationTurn["answerFailures"]>;
import type {
  ConversationFilterInput,
  ListConversationsInput,
  UpdateConversationInput,
} from "@/validators/conversations";

// Conversations and customer messages. Every query is scoped to the verified
// session user; the caller never supplies an owner.

const DEFAULT_TITLE = "Percakapan baru";

const conversationFields = {
  id: conversations.id,
  number: conversations.number,
  title: conversations.title,
  status: conversations.status,
  activeView: conversations.activeView,
  createdAt: conversations.createdAt,
};

type ConversationRow = {
  id: string;
  number: number | null;
  title: string;
  status: string;
  activeView?: string;
  createdAt: Date;
};

export function toConversationSummary(row: ConversationRow) {
  return {
    id: row.id,
    code: `#A-${row.number ?? 0}`,
    title: row.title,
    status: row.status as "active" | "ended",
    activeView: (VIEW_IDS as readonly string[]).includes(row.activeView ?? "")
      ? (row.activeView as ViewId)
      : "customer",
    createdAt: row.createdAt.toISOString(),
  };
}

export function toLabMessage(row: {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  isMasked: boolean;
  createdAt: Date;
}): LabMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    sender: row.sender === "agent" ? "agent" : "customer",
    content: row.content,
    isMasked: row.isMasked,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Starts a new conversation. Any conversation still active for this account
 * is ended in the same transaction, so there is exactly one active
 * conversation and its history stays intact.
 */
export async function startConversation(userId: string) {
  return db.transaction(async (tx) => {
    const ended = await tx
      .update(conversations)
      .set({ status: "ended" })
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversations.status, "active"),
        ),
      )
      .returning({ id: conversations.id });
    const [row] = await tx
      .insert(conversations)
      .values({ userId })
      .returning(conversationFields);
    return {
      conversation: toConversationSummary(row),
      endedIds: ended.map((item) => item.id),
    };
  });
}

export type AddMessageResult =
  | { kind: "ok"; message: LabMessage }
  | { kind: "not_found" }
  | { kind: "ended" };

/**
 * Stores a customer message. Sensitive data is masked before it is written,
 * so the original text never reaches the database. The first message names
 * a conversation that still has the default title.
 */
export async function addCustomerMessage(
  userId: string,
  conversationId: string,
  content: string,
  scenarioId?: string,
): Promise<AddMessageResult> {
  const masked = maskSensitive(content);
  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .select({
        id: conversations.id,
        status: conversations.status,
        title: conversations.title,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .for("update")
      .limit(1);
    if (!conversation) return { kind: "not_found" } as const;
    if (conversation.status !== "active") return { kind: "ended" } as const;

    const [row] = await tx
      .insert(messages)
      .values({
        conversationId,
        sender: "customer",
        content: masked.text,
        isMasked: masked.masked,
        scenarioId: scenarioId ?? null,
      })
      .returning();

    if (conversation.title === DEFAULT_TITLE) {
      const title =
        masked.text.length > 60 ? `${masked.text.slice(0, 59)}…` : masked.text;
      await tx
        .update(conversations)
        .set({ title })
        .where(eq(conversations.id, conversationId));
    } else {
      await tx
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
    return { kind: "ok", message: toLabMessage(row) } as const;
  });
}

// Jev's readings grouped into distinct combinations, so the database returns
// one row per combination instead of one per message. The cut-offs are our
// own constants, inlined so the same expression can appear in GROUP BY.
const emotionLevel = sql<string | null>`case
  when ${jevAnalyses.frustrationScore} >= ${sql.raw(String(FRUSTRATION_CUTOFF.tinggi))} then 'tinggi'
  when ${jevAnalyses.frustrationScore} >= ${sql.raw(String(FRUSTRATION_CUTOFF.sedang))} then 'sedang'
  when ${jevAnalyses.frustrationScore} is not null then 'rendah'
end`;
const highChurn = sql<boolean>`coalesce(${jevAnalyses.churnRisk} >= ${sql.raw(String(CHURN_SIGNAL))}, false)`;
const refundAsked = sql<boolean>`${jevAnalyses.labels} @> '[{"label":"Minta refund","value":"Ya"}]'::jsonb`;
const jevFields = {
  issueType: jevAnalyses.issueType,
  urgency: jevAnalyses.urgency,
  product: jevAnalyses.product,
  emotion: emotionLevel,
  decision: jevAnalyses.decision,
  sensitiveData: jevAnalyses.sensitiveData,
  injection: jevAnalyses.injectionDetected,
  churnRisk: highChurn,
  refund: refundAsked,
  count: count(),
};
const jevGroupBy = [
  jevAnalyses.issueType,
  jevAnalyses.urgency,
  jevAnalyses.product,
  emotionLevel,
  jevAnalyses.decision,
  jevAnalyses.sensitiveData,
  jevAnalyses.injectionDetected,
  highChurn,
  refundAsked,
];

/**
 * Per conversation: how Jev read its messages, how many failed to be read or
 * answered, and how many tickets they opened.
 */
async function conversationStats(conversationIds: string[]) {
  const stats = new Map<
    string,
    Pick<ConversationListItem, "jev" | "failures" | "tickets">
  >(
    conversationIds.map((id) => [
      id,
      { jev: emptyTally(), failures: 0, tickets: 0 },
    ]),
  );
  if (conversationIds.length === 0) return stats;
  const [readings, failures, ticketCounts] = await Promise.all([
    db
      .select({ conversationId: messages.conversationId, ...jevFields })
      .from(jevAnalyses)
      .innerJoin(messages, eq(messages.id, jevAnalyses.messageId))
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(jevAnalyses.status, "done"),
        ),
      )
      .groupBy(messages.conversationId, ...jevGroupBy),
    db
      .select({
        conversationId: messages.conversationId,
        count: countDistinct(messages.id),
      })
      .from(messages)
      .leftJoin(jevAnalyses, eq(jevAnalyses.messageId, messages.id))
      .leftJoin(answerFailures, eq(answerFailures.messageId, messages.id))
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          or(eq(jevAnalyses.status, "failed"), isNotNull(answerFailures.id)),
        ),
      )
      .groupBy(messages.conversationId),
    db
      .select({ conversationId: tickets.conversationId, count: count() })
      .from(tickets)
      .where(inArray(tickets.conversationId, conversationIds))
      .groupBy(tickets.conversationId),
  ]);
  for (const row of readings) {
    const entry = stats.get(row.conversationId);
    if (entry) addToTally(entry.jev, [row]);
  }
  for (const row of failures) {
    const entry = stats.get(row.conversationId);
    if (entry) entry.failures = row.count;
  }
  for (const row of ticketCounts) {
    const entry = stats.get(row.conversationId);
    if (entry) entry.tickets = row.count;
  }
  return stats;
}

/** The caller's conversations matching a status and a code/title search. */
function conversationFilter(
  userId: string,
  { q, status }: ConversationFilterInput,
): SQL | undefined {
  return and(
    eq(conversations.userId, userId),
    status === "all" ? undefined : eq(conversations.status, status),
    q
      ? or(
          ilike(conversations.title, likePattern(q)),
          ilike(sql`'#A-' || ${conversations.number}`, likePattern(q)),
        )
      : undefined,
  );
}

/**
 * The caller's saved conversations, most recent first, optionally filtered by
 * status and searched by code or title. Each item carries enough of Jev's
 * results to pick which one to review in Debug.
 */
export async function listConversations(
  userId: string,
  { limit, offset, q, status }: ListConversationsInput,
): Promise<{
  data: ConversationListItem[];
  meta: { limit: number; offset: number; hasMore: boolean };
}> {
  const rows = await db
    .select({
      ...conversationFields,
      messageCount: count(messages.id),
      lastMessageAt: max(messages.createdAt),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(conversationFilter(userId, { q, status }))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.createdAt), desc(conversations.id))
    .limit(limit + 1)
    .offset(offset);
  const page = rows.slice(0, limit);
  const stats = await conversationStats(page.map((row) => row.id));
  return {
    data: page.map((row) => ({
      ...toConversationSummary(row),
      messageCount: row.messageCount,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      jev: emptyTally(),
      failures: 0,
      tickets: 0,
      ...stats.get(row.id),
    })),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

/**
 * How Jev read every message in the caller's conversations matching the same
 * filter as the session list: intents, emotions, urgency, products,
 * decisions, and risk signals, counted per message.
 */
export async function conversationOverview(
  userId: string,
  filter: ConversationFilterInput,
): Promise<SessionOverview> {
  const where = conversationFilter(userId, filter);
  const [[sessions], readings] = await Promise.all([
    db.select({ count: count() }).from(conversations).where(where),
    db
      .select(jevFields)
      .from(jevAnalyses)
      .innerJoin(messages, eq(messages.id, jevAnalyses.messageId))
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(where, eq(jevAnalyses.status, "done")))
      .groupBy(...jevGroupBy),
  ]);
  return { sessions: sessions?.count ?? 0, ...tallyJev(readings) };
}

/**
 * Groups stored messages into turns: each customer message opens a turn, and
 * human-agent messages attach to the turn they answer.
 */
export function toBotResponse(row: typeof responses.$inferSelect): BotResponse {
  return {
    id: row.id,
    messageId: row.messageId,
    mode: row.mode === "without_jev" ? "without_jev" : "with_jev",
    content: row.content,
    latencyMs: row.latencyMs,
    costUsd: Number(row.costUsd),
    isVerified: row.isVerified,
    modelId: row.modelId,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    docCount: row.docCount,
    review: {
      verdict: row.verdict as BotResponse["review"]["verdict"],
      verdictLabel: row.verdictLabel,
      issues: row.issues,
      flags: row.flags,
      highlight: row.highlight ?? undefined,
      highlightTone:
        row.highlightTone === "good" || row.highlightTone === "bad"
          ? row.highlightTone
          : undefined,
    },
  };
}

export function buildTurns(
  rows: LabMessage[],
  answers: (typeof responses.$inferSelect)[] = [],
  readings: (typeof jevAnalyses.$inferSelect)[] = [],
  ticketRows: Awaited<ReturnType<typeof ticketsForMessages>> = [],
  failureRows: (typeof answerFailures.$inferSelect)[] = [],
): ConversationTurn[] {
  const failuresByMessage = new Map<string, AnswerFailures>();
  for (const row of failureRows) {
    const mode = row.mode === "with_jev" ? "with_jev" : "without_jev";
    failuresByMessage.set(row.messageId, {
      ...failuresByMessage.get(row.messageId),
      [mode]: {
        mode,
        error: row.error,
        modelId: row.modelId,
        latencyMs: row.latencyMs,
      },
    });
  }
  const ticketByMessage = new Map(
    ticketRows.map((ticket) => [ticket.messageId, ticket]),
  );
  const readingByMessage = new Map(
    readings.map((reading) => [reading.messageId, reading]),
  );
  const byMessage = new Map<string, (typeof responses.$inferSelect)[]>();
  for (const answer of answers) {
    byMessage.set(answer.messageId, [
      ...(byMessage.get(answer.messageId) ?? []),
      answer,
    ]);
  }
  const turns: ConversationTurn[] = [];
  for (const message of rows) {
    if (message.sender === "customer") {
      const pair = byMessage.get(message.id) ?? [];
      const jev = pair.find((answer) => answer.mode === "with_jev");
      const base = pair.find((answer) => answer.mode === "without_jev");
      const reading = readingByMessage.get(message.id);
      turns.push({
        message,
        analysis: reading ? toJevAnalysis(reading) : null,
        ...(reading?.status === "failed" && {
          analysisStatus: "failed" as const,
          analysisError: reading.error ?? undefined,
        }),
        withJev: jev ? toBotResponse(jev) : null,
        withoutJev: base ? toBotResponse(base) : null,
        ...(failuresByMessage.has(message.id) && {
          answerFailures: failuresByMessage.get(message.id),
        }),
        ticketId: ticketByMessage.get(message.id)?.code ?? null,
        ...(ticketByMessage.get(message.id)?.replies.length && {
          agentReplies: ticketByMessage.get(message.id)?.replies,
        }),
        ...(jev?.takeaway && { takeaway: jev.takeaway }),
      });
      continue;
    }
    const last = turns.at(-1);
    if (!last) continue;
    last.agentReplies = [
      ...(last.agentReplies ?? []),
      {
        id: message.id,
        ticketId: last.ticketId ?? "",
        agentName: "Tim Support",
        content: message.content,
        createdAt: message.createdAt,
      },
    ];
  }
  return turns;
}

/** The full conversation for every view, or undefined when it is not the caller's. */
export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<LabConversation | undefined> {
  const [conversation] = await db
    .select(conversationFields)
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);
  if (!conversation) return undefined;
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt), asc(messages.id));
  const ids = rows.map((row) => row.id);
  const [answers, readings, ticketRows, failureRows] = ids.length
    ? await Promise.all([
        db.select().from(responses).where(inArray(responses.messageId, ids)),
        db
          .select()
          .from(jevAnalyses)
          .where(inArray(jevAnalyses.messageId, ids)),
        ticketsForMessages(ids),
        db
          .select()
          .from(answerFailures)
          .where(inArray(answerFailures.messageId, ids)),
      ])
    : [[], [], [], []];
  return {
    ...toConversationSummary(conversation),
    turns: buildTurns(
      rows.map(toLabMessage),
      answers,
      readings,
      ticketRows,
      failureRows,
    ),
  };
}

/** The caller's newest active conversation, used when no ?c is given. */
export async function getActiveConversation(userId: string) {
  const [active] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.userId, userId), eq(conversations.status, "active")),
    )
    .orderBy(desc(conversations.createdAt), desc(conversations.id))
    .limit(1);
  return active ? getConversation(userId, active.id) : undefined;
}

/**
 * The conversation a view should open: the requested one when it belongs to
 * the caller, otherwise the newest active one. `requestedFound` tells the UI
 * whether a shared link pointed at a conversation it cannot open.
 */
export async function resolveConversation(
  userId: string,
  requestedId?: string,
) {
  if (requestedId) {
    const requested = await getConversation(userId, requestedId);
    if (requested) return { conversation: requested, requestedFound: true };
  }
  return {
    conversation: (await getActiveConversation(userId)) ?? null,
    requestedFound: !requestedId,
  };
}

/** Remembers which view the caller last used for a conversation. */
export async function updateConversation(
  userId: string,
  conversationId: string,
  input: UpdateConversationInput,
) {
  const [row] = await db
    .update(conversations)
    .set({ activeView: input.activeView })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .returning(conversationFields);
  return row ? toConversationSummary(row) : undefined;
}
