import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const VISIBLE_MS = 6000;

/** A short success message that clears itself; `confirm` shows a new one. */
export function useConfirmation() {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message]);
  const confirm = useCallback(
    (text: string) => setMessage({ id: Date.now(), text }),
    [],
  );
  const dismiss = useCallback(() => setMessage(null), []);
  return { message: message?.text ?? null, confirm, dismiss };
}

/**
 * Floating confirmation after a save or copy. The live region stays mounted
 * so screen readers announce every new message.
 */
export function Confirmation({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-30 max-w-sm max-sm:left-4"
    >
      {message && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-[14px] border bg-card px-4 py-3 text-sm shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-positive"
            aria-hidden="true"
          />
          <p className="flex-1 [overflow-wrap:anywhere]">{message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup pemberitahuan"
            className="-m-1 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
