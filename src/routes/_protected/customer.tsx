import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ChatComposer } from "@/components/lab/chat-composer";
import { ChatWidget } from "@/components/lab/chat-widget";
import { LastTurnCard } from "@/components/lab/last-turn-card";
import { maskSensitive } from "@/lib/lab/mask";
import { mockSendMessage } from "@/lib/lab/mock-api";
import { mockConversation } from "@/lib/lab/mock-data";
import type { ConversationTurn } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/customer")({
  head: () => ({ meta: [{ title: `Customer | ${siteConfig.name}` }] }),
  component: CustomerPage,
});

function CustomerPage() {
  const [turns, setTurns] = useState<ConversationTurn[]>(
    mockConversation.turns,
  );
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    setBusy(true);
    const optimisticId = `pending-${Date.now()}`;
    const preview = maskSensitive(text);
    setTurns((current) => [
      ...current,
      {
        message: {
          id: optimisticId,
          conversationId: mockConversation.id,
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
    ]);
    try {
      const turn = await mockSendMessage(mockConversation.id, text);
      setTurns((current) =>
        current.map((item) => (item.message.id === optimisticId ? turn : item)),
      );
    } catch {
      setTurns((current) =>
        current.map((item) =>
          item.message.id === optimisticId
            ? { ...item, deliveryStatus: "failed" }
            : item,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-[1200px] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <ChatWidget
        turns={turns}
        pendingReply={busy}
        onRetry={(turn) => {
          setTurns((current) =>
            current.filter((item) => item.message.id !== turn.message.id),
          );
          void send(turn.message.content);
        }}
        composer={<ChatComposer onSend={send} busy={busy} />}
      />
      <aside aria-label="Ringkasan perbandingan" className="grid gap-4">
        <LastTurnCard
          turn={turns.findLast((turn) => turn.withJev && turn.withoutJev)}
        />
      </aside>
    </div>
  );
}
