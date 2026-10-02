import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ChatComposer } from "@/components/lab/chat-composer";
import { ChatWidget } from "@/components/lab/chat-widget";
import { LastTurnCard } from "@/components/lab/last-turn-card";
import { NewConversationButton } from "@/components/lab/new-conversation-button";
import { SuggestedQuestions } from "@/components/lab/suggested-questions";
import { maskSensitive } from "@/lib/lab/mask";
import { mockSendMessage } from "@/lib/lab/mock-api";
import { mockConversation, SUGGESTED_QUESTIONS } from "@/lib/lab/mock-data";
import type { ConversationTurn } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/customer")({
  head: () => ({ meta: [{ title: `Customer | ${siteConfig.name}` }] }),
  component: CustomerPage,
});

const GREETING =
  "Halo! Saya asisten Bikinpakeai. Mau tanya soal PRDTask, DesainPakeAI, AndalAI, Template, membership, atau komunitas?";

function nextCode(code: string) {
  const number = Number(code.replace(/\D/g, "")) || 1000;
  return `#A-${number + 1}`;
}

function CustomerPage() {
  const [conversation, setConversation] = useState({
    id: mockConversation.id,
    code: mockConversation.code,
    fresh: false,
  });
  const [turns, setTurns] = useState<ConversationTurn[]>(
    mockConversation.turns,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function send(text: string) {
    setBusy(true);
    setNotice(null);
    const optimisticId = `pending-${Date.now()}`;
    const preview = maskSensitive(text);
    setTurns((current) => [
      ...current,
      {
        message: {
          id: optimisticId,
          conversationId: conversation.id,
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
      const turn = await mockSendMessage(conversation.id, text);
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

  function startNewConversation() {
    const ended = conversation.code;
    const code = nextCode(ended);
    setConversation({
      id: `mock-conversation-${Date.now()}`,
      code,
      fresh: true,
    });
    setTurns([]);
    setNotice(`Percakapan ${code} dimulai. ${ended} sudah disimpan.`);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Customer
          </h1>
          <p className="text-sm text-muted-foreground">
            Percakapan {conversation.code} · {turns.length} pesan
          </p>
        </div>
        <NewConversationButton
          currentCode={conversation.code}
          messageCount={turns.length}
          disabled={busy || turns.length === 0}
          onConfirm={startNewConversation}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ChatWidget
          turns={turns}
          greeting={conversation.fresh ? GREETING : undefined}
          pendingReply={busy}
          banner={
            notice && (
              <p
                role="status"
                className="mx-5 mt-3 rounded-[10px] border border-signal bg-signal-soft px-4 py-2.5 text-sm"
              >
                {notice}
              </p>
            )
          }
          onRetry={(turn) => {
            setTurns((current) =>
              current.filter((item) => item.message.id !== turn.message.id),
            );
            void send(turn.message.content);
          }}
          composer={
            <>
              {turns.length === 0 && (
                <SuggestedQuestions
                  questions={SUGGESTED_QUESTIONS}
                  disabled={busy}
                  onPick={(question) => void send(question)}
                />
              )}
              <ChatComposer onSend={send} busy={busy} inputRef={inputRef} />
            </>
          }
        />
        <aside aria-label="Ringkasan perbandingan" className="grid gap-4">
          <LastTurnCard
            turn={turns.findLast((turn) => turn.withJev && turn.withoutJev)}
          />
        </aside>
      </div>
    </div>
  );
}
