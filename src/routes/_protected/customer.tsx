import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ChatComposer } from "@/components/lab/chat-composer";
import { ChatWidget } from "@/components/lab/chat-widget";
import { useLabConversation } from "@/components/lab/conversation-store";
import { LastTurnCard } from "@/components/lab/last-turn-card";
import { NewConversationButton } from "@/components/lab/new-conversation-button";
import { SuggestedQuestions } from "@/components/lab/suggested-questions";
import { SUGGESTED_QUESTIONS } from "@/lib/lab/suggestions";

export const Route = createFileRoute("/_protected/customer")({
  head: () => ({ meta: [{ title: `Customer | ${siteConfig.name}` }] }),
  component: CustomerPage,
});

const GREETING =
  "Halo! Saya asisten Bikinpakeai. Mau tanya soal PRDTask, DesainPakeAI, AndalAI, Template, membership, atau komunitas?";

function CustomerPage() {
  const { conversation, busy, send, retry, startNew } = useLabConversation();
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turns = conversation.turns;

  function handleSend(text: string) {
    setNotice(null);
    void send(text);
  }

  async function startNewConversation() {
    const started = await startNew();
    setNotice(
      started
        ? `Percakapan ${started.code} dimulai. ${started.endedCode} sudah disimpan.`
        : "Percakapan baru gagal dibuat. Coba lagi.",
    );
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
          onConfirm={() => void startNewConversation()}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ChatWidget
          turns={turns}
          greeting={conversation.fresh ? GREETING : undefined}
          pendingReply={busy}
          renderBotFooter={(turn) =>
            turn.withoutJev && (
              <Link
                to="/compare"
                hash={`turn-${turn.message.id}`}
                className="font-semibold text-foreground/80 underline underline-offset-3 hover:text-signal-text"
              >
                Bandingkan
              </Link>
            )
          }
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
          onRetry={retry}
          composer={
            <>
              {turns.length === 0 && (
                <SuggestedQuestions
                  questions={SUGGESTED_QUESTIONS.slice(0, 4).map(
                    (question) => question.text,
                  )}
                  disabled={busy}
                  onPick={handleSend}
                />
              )}
              <ChatComposer
                onSend={handleSend}
                busy={busy}
                inputRef={inputRef}
              />
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
