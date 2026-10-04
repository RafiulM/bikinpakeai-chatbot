import type {
  AiSettings,
  ConversationListItem,
  ConversationTurn,
  DemoSeedResult,
  DisplaySettings,
  OpenRouterKeyCheck,
  LabConversation,
  SessionOverview,
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

  /** Saved conversations, newest first (session history). */
  async listConversations(params: {
    limit?: number;
    offset?: number;
    q?: string;
    status?: "all" | "active" | "ended";
  }) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (value !== undefined && value !== "") query.set(key, String(value));
    return request<{
      data: ConversationListItem[];
      meta: { limit: number; offset: number; hasMore: boolean };
    }>(`/api/conversations?${query}`);
  },

  /** Jev's readings across the conversations matching the same filter. */
  async sessionOverview(params: {
    q?: string;
    status?: "all" | "active" | "ended";
  }) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (value !== undefined && value !== "") query.set(key, String(value));
    const { data } = await request<{ data: SessionOverview }>(
      `/api/conversations/overview?${query}`,
    );
    return data;
  },

  /** The newest active conversation, or null when there is none. */
  async currentConversation() {
    const { data } = await request<{ data: LabConversation | null }>(
      "/api/conversations/current",
    );
    return data;
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

  async saveView(conversationId: string, activeView: ViewId) {
    await request(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      body: json({ activeView }),
    });
  },

  async getAiSettings() {
    const { data } = await request<{ data: AiSettings }>("/api/settings/ai");
    return data;
  },

  async saveOpenRouterKey(apiKey: string) {
    const { data } = await request<{ data: AiSettings }>(
      "/api/settings/openrouter-key",
      { method: "PUT", body: json({ apiKey }) },
    );
    return data;
  },

  async deleteOpenRouterKey() {
    const { data } = await request<{ data: AiSettings }>(
      "/api/settings/openrouter-key",
      { method: "DELETE" },
    );
    return data;
  },

  async checkOpenRouterKey() {
    const { data } = await request<{ data: OpenRouterKeyCheck }>(
      "/api/settings/openrouter-key/check",
      { method: "POST", body: json({}) },
    );
    return data;
  },

  async saveDisplaySettings(settings: DisplaySettings) {
    const { data } = await request<{ data: DisplaySettings }>(
      "/api/settings/display",
      { method: "PUT", body: json(settings) },
    );
    return data;
  },

  async seedDemo() {
    const { data } = await request<{ data: DemoSeedResult }>("/api/demo/seed", {
      method: "POST",
      body: json({}),
    });
    return data;
  },
};
