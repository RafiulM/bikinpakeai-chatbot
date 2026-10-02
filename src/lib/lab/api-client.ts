import type {
  ConversationTurn,
  LabConversation,
  SupportTicket,
  TicketStatus,
  ViewId,
} from "./types";

// Browser client for the Support Lab API. Same-origin fetches carry the
// session cookie and Origin header automatically.

export class LabApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new LabApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "Permintaan gagal. Coba lagi.",
    );
  }
  return (await response.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const labApi = {
  async startConversation() {
    const { data } = await request<{ data: Omit<LabConversation, "turns"> }>(
      "/api/conversations",
      { method: "POST", body: json({}) },
    );
    return { ...data, turns: [] } satisfies LabConversation;
  },

  async getConversation(id: string) {
    const { data } = await request<{ data: LabConversation }>(
      `/api/conversations/${id}`,
    );
    return data;
  },

  async sendMessage(conversationId: string, content: string) {
    const { data } = await request<{ data: { turn: ConversationTurn } }>(
      `/api/conversations/${conversationId}/messages`,
      { method: "POST", body: json({ content }) },
    );
    return data.turn;
  },

  async runScenario(scenarioId: string, conversationId: string) {
    const { data } = await request<{ data: { turn: ConversationTurn } }>(
      `/api/scenarios/${scenarioId}/run`,
      { method: "POST", body: json({ conversationId }) },
    );
    return data.turn;
  },

  async saveView(conversationId: string, activeView: ViewId) {
    await request(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      body: json({ activeView }),
    });
  },

  async listTickets() {
    return request<{
      data: SupportTicket[];
      meta: { counts: Record<TicketStatus, number>; total: number };
    }>("/api/tickets?filter=all&limit=200");
  },

  async setTicketStatus(id: string, status: TicketStatus) {
    const { data } = await request<{ data: SupportTicket }>(
      `/api/tickets/${id}`,
      {
        method: "PATCH",
        body: json({ status }),
      },
    );
    return data;
  },

  async replyTicket(id: string, content: string, close: boolean) {
    const { data } = await request<{ data: SupportTicket }>(
      `/api/tickets/${id}/replies`,
      { method: "POST", body: json({ content, close }) },
    );
    return data;
  },
};
