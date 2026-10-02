import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ChatWidget } from "@/components/lab/chat-widget";
import { LastTurnCard } from "@/components/lab/last-turn-card";
import { Button } from "@/components/ui/button";
import { mockConversation } from "@/lib/lab/mock-data";

export const Route = createFileRoute("/_protected/customer")({
  head: () => ({ meta: [{ title: `Customer | ${siteConfig.name}` }] }),
  component: CustomerPage,
});

function CustomerPage() {
  const turns = mockConversation.turns;

  return (
    <div className="grid max-w-[1200px] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <ChatWidget
        turns={turns}
        composer={
          <form className="flex items-end gap-2 max-sm:flex-col max-sm:items-stretch">
            <label htmlFor="customer-message" className="sr-only">
              Pertanyaan Anda
            </label>
            <textarea
              id="customer-message"
              rows={1}
              disabled
              placeholder="Tulis pertanyaan…"
              className="min-h-12 flex-1 resize-y rounded-2xl border border-border-strong bg-card px-4 py-3 text-[15px] disabled:bg-muted"
            />
            <Button type="submit" disabled>
              <Send aria-hidden="true" />
              Kirim
            </Button>
          </form>
        }
      />
      <aside aria-label="Ringkasan perbandingan" className="grid gap-4">
        <LastTurnCard turn={turns.at(-1)} />
      </aside>
    </div>
  );
}
