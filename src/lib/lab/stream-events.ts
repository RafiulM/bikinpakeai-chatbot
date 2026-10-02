import type { TurnDelta } from "./compare";
import type { BotResponse, JevAnalysis } from "./types";

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
  | { type: "comparison"; messageId: string; delta: TurnDelta | null };

export interface LabStream {
  subscribe(listener: (event: LabStreamEvent) => void): () => void;
}
