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
import { useNavigate, useSearch } from "@tanstack/react-router";
import { maskSensitive } from "@/lib/lab/mask";
import { mockSendMessage } from "@/lib/lab/mock-api";
import { createMockStream, playMockPipeline } from "@/lib/lab/mock-stream";
import type { LabStreamEvent } from "@/lib/lab/stream-events";
import { mockConversation } from "@/lib/lab/mock-data";
import type { ConversationTurn, LabConversation } from "@/lib/lab/types";

// One conversation store for every view. Customer, Debug, Compare and Agent
// all read from here, so switching views never loses the conversation.

export interface StoredConversation extends LabConversation {
  /** True for a conversation started in this session (shows the greeting). */
  fresh: boolean;
}

interface StoreState {
  conversations: Record<string, StoredConversation>;
  activeId: string;
  pending: number;
  /** False until the saved browser session has been read. */
  hydrated: boolean;
}

type Action =
  | { type: "hydrate"; state: StoreState | null }
  | { type: "select"; id: string }
  | { type: "start"; conversation: StoredConversation }
  | { type: "append"; conversationId: string; turn: ConversationTurn }
  | {
      type: "replace";
      conversationId: string;
      tempId: string;
      turn: ConversationTurn;
    }
  | { type: "fail"; conversationId: string; tempId: string }
  | { type: "remove"; conversationId: string; messageId: string }
  | { type: "stream"; conversationId: string; event: LabStreamEvent };

const STORAGE_KEY = "bikinpakeai-support-lab:v1";

const initialState: StoreState = {
  conversations: {
    [mockConversation.id]: { ...mockConversation, fresh: false },
  },
  activeId: mockConversation.id,
  pending: 0,
  hydrated: false,
};

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

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "hydrate":
      return { ...(action.state ?? state), hydrated: true };
    case "select":
      return state.conversations[action.id]
        ? { ...state, activeId: action.id }
        : state;
    case "start": {
      const previous = state.conversations[state.activeId];
      return {
        ...state,
        activeId: action.conversation.id,
        conversations: {
          ...state.conversations,
          ...(previous && {
            [previous.id]: { ...previous, status: "ended", fresh: false },
          }),
          [action.conversation.id]: action.conversation,
        },
      };
    }
    case "append": {
      const next = updateTurns(state, action.conversationId, (turns) => [
        ...turns,
        action.turn,
      ]);
      const conversation = next.conversations[action.conversationId];
      // Name a fresh conversation after its first question.
      if (
        conversation &&
        conversation.turns.length === 1 &&
        conversation.fresh
      ) {
        const text = action.turn.message.content;
        next.conversations[action.conversationId] = {
          ...conversation,
          title: text.length > 40 ? `${text.slice(0, 39)}…` : text,
        };
      }
      return { ...next, pending: next.pending + 1 };
    }
    case "replace":
      return {
        ...updateTurns(state, action.conversationId, (turns) =>
          turns.map((turn) =>
            turn.message.id === action.tempId ? action.turn : turn,
          ),
        ),
        pending: Math.max(0, state.pending - 1),
      };
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
      return updateTurns(state, action.conversationId, (turns) =>
        turns.map((turn) => {
          if (turn.message.id !== event.messageId) return turn;
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
              return {
                ...turn,
                analysisStatus: "failed",
                analysisError: event.error,
              };
            case "answer":
              return event.response.mode === "with_jev"
                ? { ...turn, withJev: event.response }
                : { ...turn, withoutJev: event.response };
            default:
              return turn;
          }
        }),
      );
    }
    case "remove":
      return updateTurns(state, action.conversationId, (turns) =>
        turns.filter((turn) => turn.message.id !== action.messageId),
      );
  }
}

function nextCode(conversations: Record<string, StoredConversation>) {
  const highest = Math.max(
    1000,
    ...Object.values(conversations).map(
      (conversation) => Number(conversation.code.replace(/\D/g, "")) || 0,
    ),
  );
  return `#A-${highest + 1}`;
}

/** Restores a saved session; in-flight messages from a closed tab become failed. */
function readStored(): StoreState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreState;
    if (!parsed.conversations?.[parsed.activeId]) return null;
    for (const conversation of Object.values(parsed.conversations)) {
      conversation.turns = conversation.turns.map((turn) => {
        if (turn.deliveryStatus === "sending")
          return { ...turn, deliveryStatus: "failed" };
        if (turn.analysisStatus === "pending")
          return {
            ...turn,
            analysisStatus: "failed",
            analysisError: "Analisis terputus karena halaman ditutup.",
          };
        return turn;
      });
    }
    return { ...parsed, pending: 0, hydrated: true };
  } catch {
    return null;
  }
}

interface LabConversationValue {
  conversation: StoredConversation;
  conversations: StoredConversation[];
  busy: boolean;
  send: (text: string) => Promise<void>;
  retry: (turn: ConversationTurn) => void;
  startNew: () => { endedCode: string; code: string };
  select: (id: string) => void;
}

const LabConversationContext = createContext<LabConversationValue | null>(null);

export function LabConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const lastUrlId = useRef<string | undefined>(undefined);
  const { c } = useSearch({ from: "/_protected" });
  const navigate = useNavigate();
  const active = state.conversations[state.activeId];
  const hydrated = state.hydrated;

  // Load the saved session once in the browser (never during SSR).
  useEffect(() => {
    dispatch({ type: "hydrate", state: readStored() });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  // URL → state: opening ?c=<id> of a known conversation selects it.
  // state → URL: otherwise the address bar follows the active conversation.
  useEffect(() => {
    if (!hydrated) return;
    if (
      c &&
      c !== state.activeId &&
      c !== lastUrlId.current &&
      state.conversations[c]
    ) {
      lastUrlId.current = c;
      dispatch({ type: "select", id: c });
      return;
    }
    lastUrlId.current = state.activeId;
    if (c !== state.activeId) {
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, c: state.activeId }),
        replace: true,
        resetScroll: false,
      });
    }
  }, [hydrated, c, state.activeId, state.conversations, navigate]);

  // Live updates: Jev's reading and the baseline answer arrive after the
  // customer already sees the fast reply.
  const conversationIds = Object.keys(state.conversations).sort().join(",");
  useEffect(() => {
    const unsubscribers = conversationIds
      .split(",")
      .filter(Boolean)
      .map((conversationId) =>
        createMockStream(conversationId).subscribe((event) =>
          dispatch({ type: "stream", conversationId, event }),
        ),
      );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [conversationIds]);

  const send = useCallback(
    async (text: string) => {
      const conversationId = state.activeId;
      const tempId = `pending-${Date.now()}`;
      const preview = maskSensitive(text);
      dispatch({
        type: "append",
        conversationId,
        turn: {
          message: {
            id: tempId,
            conversationId,
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
      try {
        const turn = await mockSendMessage(conversationId, text);
        dispatch({ type: "replace", conversationId, tempId, turn });
        playMockPipeline(conversationId, turn);
      } catch {
        dispatch({ type: "fail", conversationId, tempId });
      }
    },
    [state.activeId],
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

  const startNew = useCallback(() => {
    const code = nextCode(state.conversations);
    const id = `local-${Date.now()}`;
    dispatch({
      type: "start",
      conversation: {
        id,
        code,
        title: "Percakapan baru",
        status: "active",
        createdAt: new Date().toISOString(),
        turns: [],
        fresh: true,
      },
    });
    return { endedCode: active?.code ?? "", code };
  }, [state.conversations, active?.code]);

  const select = useCallback(
    (id: string) => dispatch({ type: "select", id }),
    [],
  );

  const value = useMemo<LabConversationValue>(
    () => ({
      conversation: active,
      conversations: Object.values(state.conversations),
      busy: state.pending > 0,
      send,
      retry,
      startNew,
      select,
    }),
    [active, state.conversations, state.pending, send, retry, startNew, select],
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
