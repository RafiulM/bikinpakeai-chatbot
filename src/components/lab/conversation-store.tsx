import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { labApi } from "@/lib/lab/api-client";
import { maskSensitive } from "@/lib/lab/mask";
import type { LabStreamEvent } from "@/lib/lab/stream-events";
import {
  VIEW_IDS,
  type AgentReply,
  type ConversationTurn,
  type LabConversation,
  type ViewId,
} from "@/lib/lab/types";

// One conversation store for every view. Customer, Debug, Compare and Agent
// all read from here, so switching views never loses the conversation. The
// server is the source of truth: the first render comes from the route
// loader, changes go through the API, and live updates arrive over SSE.

export const DRAFT_ID = "draft";

export interface StoredConversation extends LabConversation {
  /** True for a conversation started in this session (shows the greeting). */
  fresh: boolean;
}

interface StoreState {
  conversations: Record<string, StoredConversation>;
  activeId: string;
  pending: number;
  /** Live events that arrived before their message was in the store. */
  early: Record<string, LabStreamEvent[]>;
}

type Action =
  | { type: "load"; conversation: StoredConversation; activate: boolean }
  | { type: "select"; id: string }
  | { type: "start"; conversation: StoredConversation; replaceDraft: boolean }
  | { type: "append"; conversationId: string; turn: ConversationTurn }
  | {
      type: "replace";
      conversationId: string;
      tempId: string;
      turn: ConversationTurn;
    }
  | { type: "fail"; conversationId: string; tempId: string }
  | { type: "remove"; conversationId: string; messageId: string }
  | { type: "stream"; conversationId: string; event: LabStreamEvent }
  | {
      type: "agentReply";
      conversationId: string;
      messageId: string;
      reply: AgentReply;
    }
  | { type: "sync"; conversation: LabConversation };

function draftConversation(): StoredConversation {
  return {
    id: DRAFT_ID,
    code: "Baru",
    title: "Percakapan baru",
    status: "active",
    createdAt: new Date(0).toISOString(),
    turns: [],
    fresh: true,
  };
}

function updateTurns(
  state: StoreState,
  conversationId: string,
  update: (turns: ConversationTurn[]) => ConversationTurn[],
): StoreState {
  const conversation = state.conversations[conversationId];
  if (!conversation) return state;
  return {
    ...state,
    conversations: {
      ...state.conversations,
      [conversationId]: { ...conversation, turns: update(conversation.turns) },
    },
  };
}

/** Applies one live event to the turn it belongs to. */
function applyEvent(
  turn: ConversationTurn,
  event: LabStreamEvent,
): ConversationTurn {
  switch (event.type) {
    case "analysis":
      return {
        ...turn,
        analysis: event.analysis,
        analysisStatus: undefined,
        analysisError: undefined,
        ticketId: event.ticketId ?? turn.ticketId,
      };
    case "analysis_failed":
      return { ...turn, analysisStatus: "failed", analysisError: event.error };
    case "answer":
      return event.response.mode === "with_jev"
        ? { ...turn, withJev: event.response }
        : { ...turn, withoutJev: event.response };
    case "agent_reply":
      return turn.agentReplies?.some((reply) => reply.id === event.reply.id)
        ? turn
        : {
            ...turn,
            agentReplies: [...(turn.agentReplies ?? []), event.reply],
          };
    default:
      return turn;
  }
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "load":
      return {
        ...state,
        activeId: action.activate ? action.conversation.id : state.activeId,
        conversations: {
          ...state.conversations,
          [action.conversation.id]: action.conversation,
        },
      };
    case "select":
      return state.conversations[action.id]
        ? { ...state, activeId: action.id }
        : state;
    case "start": {
      const conversations = { ...state.conversations };
      const draft = conversations[DRAFT_ID];
      if (action.replaceDraft) delete conversations[DRAFT_ID];
      for (const [id, conversation] of Object.entries(conversations))
        if (conversation.status === "active")
          conversations[id] = {
            ...conversation,
            status: "ended",
            fresh: false,
          };
      conversations[action.conversation.id] = {
        ...action.conversation,
        // Keep the message being sent from the draft.
        turns:
          action.replaceDraft && draft
            ? draft.turns
            : action.conversation.turns,
      };
      return { ...state, conversations, activeId: action.conversation.id };
    }
    case "append": {
      const next = updateTurns(state, action.conversationId, (turns) => [
        ...turns,
        action.turn,
      ]);
      return { ...next, pending: next.pending + 1 };
    }
    case "replace": {
      const early = state.early[action.turn.message.id] ?? [];
      const rest = { ...state.early };
      delete rest[action.turn.message.id];
      const turn = early.reduce(applyEvent, action.turn);
      return {
        ...updateTurns(state, action.conversationId, (turns) =>
          turns.map((item) =>
            item.message.id === action.tempId ? turn : item,
          ),
        ),
        early: rest,
        pending: Math.max(0, state.pending - 1),
      };
    }
    case "fail":
      return {
        ...updateTurns(state, action.conversationId, (turns) =>
          turns.map((turn) =>
            turn.message.id === action.tempId
              ? { ...turn, deliveryStatus: "failed" as const }
              : turn,
          ),
        ),
        pending: Math.max(0, state.pending - 1),
      };
    case "stream": {
      const { event } = action;
      const conversation = state.conversations[action.conversationId];
      if (!conversation || !event.messageId) return state;
      const known = conversation.turns.some(
        (turn) => turn.message.id === event.messageId,
      );
      if (!known)
        return {
          ...state,
          early: {
            ...state.early,
            [event.messageId]: [...(state.early[event.messageId] ?? []), event],
          },
        };
      return updateTurns(state, action.conversationId, (turns) =>
        turns.map((turn) =>
          turn.message.id === event.messageId ? applyEvent(turn, event) : turn,
        ),
      );
    }
    case "agentReply":
      return updateTurns(state, action.conversationId, (turns) =>
        turns.map((turn) =>
          turn.message.id === action.messageId
            ? applyEvent(turn, {
                type: "agent_reply",
                messageId: action.messageId,
                reply: action.reply,
              })
            : turn,
        ),
      );
    case "remove":
      return updateTurns(state, action.conversationId, (turns) =>
        turns.filter((turn) => turn.message.id !== action.messageId),
      );
    case "sync": {
      // Server state wins for stored messages; local in-flight messages stay.
      const local = state.conversations[action.conversation.id];
      if (!local) return state;
      const stored = new Set(
        action.conversation.turns.map((turn) => turn.message.id),
      );
      const inFlight = local.turns.filter(
        (turn) => turn.deliveryStatus && !stored.has(turn.message.id),
      );
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [local.id]: {
            ...local,
            ...action.conversation,
            fresh: local.fresh,
            turns: [...action.conversation.turns, ...inFlight],
          },
        },
      };
    }
  }
}

interface LabConversationValue {
  conversation: StoredConversation;
  conversations: StoredConversation[];
  busy: boolean;
  /** Resolves with the stored message id, or undefined when sending failed. */
  send: (text: string) => Promise<string | undefined>;
  /** Sends a ready-made scenario through the same pipeline. */
  runScenario: (
    scenarioId: string,
    prompt: string,
  ) => Promise<string | undefined>;
  retry: (turn: ConversationTurn) => void;
  startNew: () => Promise<{ endedCode: string; code: string } | null>;
  select: (id: string) => void;
  addAgentReply: (
    conversationId: string,
    messageId: string,
    reply: AgentReply,
  ) => void;
}

const LabConversationContext = createContext<LabConversationValue | null>(null);

export function LabConversationProvider({
  initial,
  children,
}: {
  /** Conversation resolved by the route loader during server rendering. */
  initial: LabConversation | null;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const first: StoredConversation = initial
      ? { ...initial, fresh: initial.turns.length === 0 }
      : draftConversation();
    return {
      conversations: { [first.id]: first },
      activeId: first.id,
      pending: 0,
      early: {},
    };
  });
  const { c } = useSearch({ from: "/_protected" });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastUrlId = useRef<string | undefined>(undefined);
  const creating = useRef<Promise<StoredConversation> | null>(null);
  const active = state.conversations[state.activeId];

  // URL → state: ?c=<id> of another conversation loads and selects it.
  // state → URL: otherwise the address bar follows the active conversation.
  useEffect(() => {
    if (c && c !== state.activeId && c !== lastUrlId.current) {
      lastUrlId.current = c;
      if (state.conversations[c]) {
        dispatch({ type: "select", id: c });
      } else {
        labApi
          .getConversation(c)
          .then((conversation) =>
            dispatch({
              type: "load",
              conversation: { ...conversation, fresh: false },
              activate: true,
            }),
          )
          .catch(() => {
            // Unknown or not ours: follow the active conversation instead.
            lastUrlId.current = undefined;
            void navigate({
              to: ".",
              search: (prev) => ({ ...prev, c: undefined }),
              replace: true,
            });
          });
      }
      return;
    }
    lastUrlId.current = state.activeId;
    const target = state.activeId === DRAFT_ID ? undefined : state.activeId;
    if (c !== target) {
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, c: target }),
        replace: true,
        resetScroll: false,
      });
    }
  }, [c, state.activeId, state.conversations, navigate]);

  // Live updates for the active conversation.
  useEffect(() => {
    if (state.activeId === DRAFT_ID || typeof EventSource === "undefined")
      return;
    const conversationId = state.activeId;
    const source = new EventSource(
      `/api/conversations/${conversationId}/events`,
    );
    const forward = (message: MessageEvent<string>) => {
      try {
        dispatch({
          type: "stream",
          conversationId,
          event: JSON.parse(message.data) as LabStreamEvent,
        });
      } catch {
        // Ignore malformed events.
      }
    };
    for (const type of ["analysis", "analysis_failed", "answer", "agent_reply"])
      source.addEventListener(type, forward as EventListener);
    // Each (re)connect catches up on anything sent while disconnected.
    const resync = () =>
      labApi
        .getConversation(conversationId)
        .then((conversation) => dispatch({ type: "sync", conversation }))
        .catch(() => {});
    source.addEventListener("ready", resync);
    return () => source.close();
  }, [state.activeId]);

  // Remember the last view per conversation.
  useEffect(() => {
    const view = pathname.slice(1) as ViewId;
    if (
      state.activeId === DRAFT_ID ||
      !(VIEW_IDS as readonly string[]).includes(view)
    )
      return;
    const timer = setTimeout(() => {
      labApi.saveView(state.activeId, view).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [pathname, state.activeId]);

  /** The active conversation id, created on the server first if a draft. */
  const ensureConversation = useCallback(async () => {
    if (state.activeId !== DRAFT_ID) return state.activeId;
    creating.current ??= labApi
      .startConversation()
      .then((created) => ({ ...created, fresh: true }))
      .finally(() => {
        creating.current = null;
      });
    const created = await creating.current;
    dispatch({ type: "start", conversation: created, replaceDraft: true });
    return created.id;
  }, [state.activeId]);

  /**
   * Safety net for the live stream: re-reads the conversation a few times
   * until the answer without Jev for this message has been stored.
   */
  const awaitBaseline = useCallback(
    async (conversationId: string, messageId: string) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const conversation = await labApi.getConversation(conversationId);
          const turn = conversation.turns.find(
            (item) => item.message.id === messageId,
          );
          if (turn?.withoutJev) {
            dispatch({ type: "sync", conversation });
            return;
          }
        } catch {
          return;
        }
      }
    },
    [],
  );

  const deliver = useCallback(
    async (
      text: string,
      call: (conversationId: string) => Promise<ConversationTurn>,
    ) => {
      const tempId = `pending-${Date.now()}`;
      const preview = maskSensitive(text);
      const startedIn = state.activeId;
      dispatch({
        type: "append",
        conversationId: startedIn,
        turn: {
          message: {
            id: tempId,
            conversationId: startedIn,
            sender: "customer",
            content: preview.text,
            isMasked: preview.masked,
            createdAt: new Date().toISOString(),
          },
          analysis: null,
          withJev: null,
          withoutJev: null,
          ticketId: null,
          deliveryStatus: "sending",
        },
      });
      let conversationId = startedIn;
      try {
        conversationId = await ensureConversation();
        const turn = await call(conversationId);
        dispatch({ type: "replace", conversationId, tempId, turn });
        if (!turn.withoutJev)
          void awaitBaseline(conversationId, turn.message.id);
        return turn.message.id;
      } catch {
        dispatch({ type: "fail", conversationId, tempId });
        return undefined;
      }
    },
    [state.activeId, ensureConversation, awaitBaseline],
  );

  const send = useCallback(
    (text: string) => deliver(text, (id) => labApi.sendMessage(id, text)),
    [deliver],
  );

  const runScenario = useCallback(
    (scenarioId: string, prompt: string) =>
      deliver(prompt, (id) => labApi.runScenario(scenarioId, id)),
    [deliver],
  );

  const retry = useCallback(
    (turn: ConversationTurn) => {
      dispatch({
        type: "remove",
        conversationId: turn.message.conversationId,
        messageId: turn.message.id,
      });
      void send(turn.message.content);
    },
    [send],
  );

  const startNew = useCallback(async () => {
    const endedCode = active?.code ?? "";
    try {
      const created = await labApi.startConversation();
      dispatch({
        type: "start",
        conversation: { ...created, fresh: true },
        replaceDraft: state.activeId === DRAFT_ID,
      });
      return { endedCode, code: created.code };
    } catch {
      return null;
    }
  }, [active?.code, state.activeId]);

  const select = useCallback(
    (id: string) => dispatch({ type: "select", id }),
    [],
  );

  const addAgentReply = useCallback(
    (conversationId: string, messageId: string, reply: AgentReply) =>
      dispatch({ type: "agentReply", conversationId, messageId, reply }),
    [],
  );

  const value = useMemo<LabConversationValue>(
    () => ({
      conversation: active,
      conversations: Object.values(state.conversations),
      busy: state.pending > 0,
      send,
      runScenario,
      retry,
      startNew,
      select,
      addAgentReply,
    }),
    [
      active,
      state.conversations,
      state.pending,
      send,
      runScenario,
      retry,
      startNew,
      select,
      addAgentReply,
    ],
  );

  return (
    <LabConversationContext.Provider value={value}>
      {children}
    </LabConversationContext.Provider>
  );
}

/** Sidebar summary of the conversation shared by every view. */
export function useActiveConversationSummary() {
  const { conversation } = useLabConversation();
  return {
    id: conversation.id,
    code: conversation.code,
    title: conversation.title,
    messageCount: conversation.turns.length,
  };
}

export function useLabConversation() {
  const value = useContext(LabConversationContext);
  if (!value)
    throw new Error(
      "useLabConversation must be used inside LabConversationProvider.",
    );
  return value;
}
