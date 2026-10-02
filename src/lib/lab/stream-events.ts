import type { TurnDelta } from "./compare";
import type { AgentReply, BotResponse, JevAnalysis } from "./types";

// Live events for one conversation. The mock stream and the server's
// /api/conversations/:id/events stream send exactly these shapes.
export type LabStreamEvent =
  | {
      type: "analysis";
      messageId: string;
      analysis: JevAnalysis;
      ticketId?: string | null;
    }
  | { type: "analysis_failed"; messageId: string; error: string }
  | { type: "answer"; messageId: string; response: BotResponse }
  | { type: "agent_reply"; messageId: string; reply: AgentReply }
  | {
      type: "comparison";
      messageId: string;
      delta: TurnDelta | null;
      /** Cumulative totals after this pair, sent by the server stream. */
      summary?: unknown;
    };

export interface LabStream {
  subscribe(listener: (event: LabStreamEvent) => void): () => void;
}
