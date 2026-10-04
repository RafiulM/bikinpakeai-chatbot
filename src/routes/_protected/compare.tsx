import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Archive, ArrowDown, Bot } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/lab/chat-composer";
import { BOT_NAME, ChatbotTurn } from "@/components/lab/chatbot-turn";
import { useLabConversation } from "@/components/lab/conversation-store";
import { useDisplaySettings } from "@/components/lab/display-settings";
import { NewConversationButton } from "@/components/lab/new-conversation-button";
import { SideBySideTurn } from "@/components/lab/side-by-side";
import { SuggestedQuestions } from "@/components/lab/suggested-questions";
import { useFollowLatest } from "@/components/lab/use-follow-latest";
import { labApi } from "@/lib/lab/api-client";
import { sortTurns } from "@/lib/lab/conversation";
import { SUGGESTED_QUESTIONS } from "@/lib/lab/suggestions";

// The main view: ask once, read the answer with Jev and without Jev side by
// side, with running totals on top. With demo mode off it is the plain
// customer chatbot for the chosen path.
export const Route = createFileRoute("/_protected/compare")({
  head: () => ({ meta: [{ title: `Chat | ${siteConfig.name}` }] }),
  component: ChatPage,
});

function ChatPage() {
  const { conversation, busy, send, retry, startNew } = useLabConversation();
  const { demoMode, chatbot } = useDisplaySettings().settings;
  const turns = useMemo(
    () => sortTurns(conversation.turns),
    [conversation.turns],
  );
  const [notice, setNotice] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  // A session opened from the history is read-only: the server only takes
  // messages for the active conversation.
  const archived = conversation.status === "ended";
  const [leaving, setLeaving] = useState(false);
  const last = turns.at(-1);
  // Changes whenever something new and visible lands at the end of the
  // conversation; the chatbot alone ignores the path it does not show.
  const showJev = demoMode || chatbot === "with_jev";
  const showBaseline = demoMode || chatbot === "without_jev";
  const tailKey = [
    last?.message.id,
    showJev && last?.withJev?.id,
    showBaseline && last?.withoutJev?.id,
    showJev && last?.agentReplies?.length,
  ].join("|");
  const { hasNew, scrollToEnd } = useFollowLatest(
    tailKey,
    last?.deliveryStatus === "sending",
  );

  function handleSend(text: string) {
    setNotice(null);
    void send(text);
  }

  async function startNewConversation() {
    const started = await startNew();
    setNotice(
      started
        ? { text: `Percakapan ${started.code} dimulai.`, error: false }
        : { text: "Percakapan baru gagal dibuat. Coba lagi.", error: true },
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /** Leaves an archived session for the active one, or a new one. */
  async function backToActive() {
    setLeaving(true);
    try {
      const current = await labApi.currentConversation();
      if (current) {
        await navigate({
          to: ".",
          search: (prev) => ({ ...prev, c: current.id }),
        });
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        await startNewConversation();
      }
    } catch {
      setNotice({
        text: "Sesi aktif gagal dibuka. Coba lagi.",
        error: true,
      });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="-mb-10 flex min-h-[calc(100dvh-3.5rem-1.5rem)] flex-col">
      {turns.length === 0 ? (
        <div className="grid flex-1 content-center justify-items-center gap-5 py-10 text-center">
          {demoMode ? (
            <h1 className="font-serif text-[clamp(28px,3vw,36px)] leading-tight tracking-[-0.8px]">
              Satu pertanyaan, dua jawaban.
            </h1>
          ) : (
            <div className="grid justify-items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-signal-soft text-signal-text"
              >
                <Bot className="size-6" />
              </span>
              <h1 className="font-serif text-[clamp(28px,3vw,36px)] leading-tight tracking-[-0.8px]">
                Halo, ada yang bisa kami bantu?
              </h1>
              <p className="max-w-[480px] text-[15px] text-muted-foreground">
                {BOT_NAME} siap menjawab soal akun, tagihan, dan fitur.
              </p>
            </div>
          )}
          {!archived && (
            <SuggestedQuestions
              questions={SUGGESTED_QUESTIONS.slice(0, 4).map(
                (question) => question.text,
              )}
              disabled={busy}
              onPick={handleSend}
            />
          )}
        </div>
      ) : (
        <>
          <h1 className="sr-only">Chat · percakapan {conversation.code}</h1>
          <ol
            role="log"
            aria-label="Riwayat percakapan"
            className="flex flex-1 flex-col gap-6 pt-3 pb-6"
          >
            {turns.map((turn) =>
              demoMode ? (
                <SideBySideTurn
                  key={turn.message.id}
                  turn={turn}
                  onRetry={() => retry(turn)}
                />
              ) : (
                <ChatbotTurn
                  key={turn.message.id}
                  turn={turn}
                  mode={chatbot}
                  onRetry={() => retry(turn)}
                />
              ),
            )}
          </ol>
        </>
      )}
      <div className="sticky bottom-0 z-10 -mx-1 grid gap-2 bg-gradient-to-t from-background from-80% to-background/0 px-1 pt-6 pb-4">
        {hasNew && (
          <button
            type="button"
            onClick={() => scrollToEnd(true)}
            className="absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background shadow-[0_0_14px_rgb(0_0_0/7%)]"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
            Pesan baru
          </button>
        )}
        <p
          role="status"
          className={notice?.error ? "text-sm text-danger-text" : "sr-only"}
        >
          {notice?.text}
        </p>
        {archived ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border bg-card px-4 py-3 shadow-[0_0_14px_rgb(0_0_0/5%)]">
            <p className="flex items-center gap-2 text-sm">
              <Archive
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">
                  Sesi {conversation.code} sudah selesai.
                </strong>{" "}
                <span className="text-muted-foreground">
                  Tersimpan sebagai arsip dan tidak bisa dibalas lagi.
                </span>
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {demoMode && turns.length > 0 && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/debug">Review Debug</Link>
                </Button>
              )}
              <Button
                size="sm"
                disabled={leaving}
                onClick={() => void backToActive()}
              >
                Kembali ke chat aktif
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="pt-1 rekam:hidden">
              <NewConversationButton
                currentCode={conversation.code}
                messageCount={turns.length}
                disabled={busy || turns.length === 0}
                onConfirm={() => void startNewConversation()}
              />
            </div>
            <div className="min-w-0 flex-1">
              <ChatComposer
                onSend={handleSend}
                busy={busy}
                inputRef={inputRef}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
