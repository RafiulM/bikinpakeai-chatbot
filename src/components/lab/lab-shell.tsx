import { useState, type ReactNode } from "react";
import { Check, Link2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SignOutButton } from "@/components/sign-out-button";
import { useViewShortcuts } from "./use-view-shortcuts";
import { ViewNav } from "./view-nav";

/**
 * Signed-in frame for every Support Lab view: a navigation rail on wide
 * screens, a scrollable top bar on narrow ones.
 */
export function LabShell({
  session,
  userEmail,
  children,
}: {
  /** Summary of the conversation shared by all views. */
  session: ReactNode;
  userEmail: string;
  children: ReactNode;
}) {
  useViewShortcuts();
  return (
    <div className="grid min-h-dvh content-start lg:grid-cols-[232px_minmax(0,1fr)] lg:content-stretch">
      <aside className="z-10 flex gap-6 border-b bg-canvas-warm px-4 py-2 max-lg:sticky max-lg:top-0 max-lg:items-center max-lg:overflow-x-auto lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-3 lg:py-5">
        <Link
          to="/customer"
          className="grid shrink-0 gap-0.5 rounded-[10px] px-3 py-1 max-lg:px-0"
        >
          <span className="text-[17px] leading-tight font-semibold tracking-tight">
            Bikinpakeai
          </span>
          <span className="text-xs text-muted-foreground max-lg:hidden">
            Support Lab · Jev vs tanpa Jev
          </span>
        </Link>
        <ViewNav />
        <div className="ml-auto shrink-0 lg:hidden">
          <SignOutButton />
        </div>
        <div className="mt-auto grid gap-3 max-lg:hidden">
          {session}
          <div className="grid gap-2 px-1">
            <p
              className="truncate text-xs text-muted-foreground"
              title={userEmail}
            >
              {userEmail}
            </p>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main
        id="main-content"
        className="min-w-0 px-8 pt-6 pb-10 max-lg:px-4 max-lg:pt-4"
      >
        {children}
      </main>
    </div>
  );
}

export function SessionCard({
  code,
  title,
  messageCount,
  conversationId,
}: {
  code: string;
  title: string;
  messageCount: number;
  conversationId: string;
}) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("c", conversationId);
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2000);
  }

  return (
    <section
      aria-label="Percakapan aktif"
      className="grid gap-1 rounded-2xl border bg-card px-4 py-3 text-[13px] leading-snug"
    >
      <p className="text-xs font-semibold text-muted-foreground">
        Percakapan aktif
      </p>
      <p className="font-semibold [overflow-wrap:anywhere]">
        {code} · {title}
      </p>
      <p className="text-muted-foreground">
        {messageCount} pesan · tetap utuh di semua tampilan
      </p>
      <button
        type="button"
        onClick={copyLink}
        className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full text-xs font-semibold underline underline-offset-3"
      >
        {copied === "done" ? (
          <Check className="size-3.5 text-positive" aria-hidden="true" />
        ) : (
          <Link2 className="size-3.5" aria-hidden="true" />
        )}
        {copied === "done"
          ? "Tautan tersalin"
          : copied === "failed"
            ? "Gagal menyalin"
            : "Salin tautan tampilan ini"}
      </button>
      <span role="status" className="sr-only">
        {copied === "done" ? "Tautan tampilan ini tersalin." : ""}
      </span>
    </section>
  );
}
