import type { ReactNode } from "react";
import { Settings, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import { useDisplaySettings } from "./display-settings";
import { useRecordingMode } from "./recording-mode";
import { useViewShortcuts } from "./use-view-shortcuts";
import { ViewNav } from "./view-nav";

/**
 * Signed-in frame for every Support Lab view: one slim bar on top. With demo
 * mode off the bar keeps only the name, Pengaturan, and sign out, so Chat
 * reads as the real customer chatbot.
 */
export function LabShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: ReactNode;
}) {
  const { demoMode } = useDisplaySettings().settings;
  useViewShortcuts(demoMode);
  const { recording, setRecording } = useRecordingMode();
  if (recording)
    return (
      <div data-recording="on" className="min-h-dvh bg-background">
        <button
          type="button"
          onClick={() => setRecording(false)}
          className="fixed top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-40 shadow-sm transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-3.5" aria-hidden="true" />
          Keluar mode rekaman
          <kbd className="rounded border px-1 font-mono text-[11px]">Esc</kbd>
        </button>
        <main
          id="main-content"
          className={cn(
            "mx-auto min-w-0 max-w-[1280px] px-10 pt-10 pb-12 max-lg:px-4 max-lg:pt-14",
            // Larger text and numbers read better on a recorded screen.
            "lg:[zoom:1.12]",
          )}
        >
          {children}
        </main>
      </div>
    );
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 overflow-x-auto border-b [scrollbar-width:none] bg-canvas-warm/95 px-6 backdrop-blur max-sm:gap-2 max-sm:px-3">
        <Link
          to="/compare"
          className={cn(
            "shrink-0 text-[17px] font-semibold tracking-tight",
            demoMode && "max-sm:hidden",
          )}
        >
          Bikinpakeai
        </Link>
        {demoMode ? (
          <ViewNav />
        ) : (
          <Link
            to="/pengaturan"
            aria-label="Pengaturan"
            title="Pengaturan"
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
          >
            <Settings className="size-[18px]" aria-hidden="true" />
          </Link>
        )}
        <SignOutButton compact title={`Sign out · ${userEmail}`} />
      </header>
      <main
        id="main-content"
        className="mx-auto min-w-0 max-w-[1280px] px-6 pt-6 pb-10 max-sm:px-3 max-sm:pt-4"
      >
        {children}
      </main>
    </div>
  );
}
