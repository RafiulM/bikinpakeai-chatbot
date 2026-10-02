import { useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTranscript } from "@/lib/lab/transcript";
import type { LabConversation } from "@/lib/lab/types";

type CopyState = "idle" | "copied" | "manual";

/** Copies the labelled transcript, with a preview of exactly what is copied. */
export function CopyTranscript({
  conversation,
}: {
  conversation: Pick<LabConversation, "code" | "title" | "turns">;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const preview = useRef<HTMLPreElement>(null);
  const text = useMemo(() => buildTranscript(conversation), [conversation]);
  const empty = conversation.turns.length === 0;

  async function copy() {
    // Built again so the header time is the moment of copying.
    const fresh = buildTranscript(conversation);
    try {
      await navigator.clipboard.writeText(fresh);
      setState("copied");
    } catch {
      // Clipboard blocked: select the preview so Ctrl/Cmd+C still works.
      const node = preview.current;
      if (node) window.getSelection()?.selectAllChildren(node);
      setState("manual");
    }
  }

  return (
    <div className="grid gap-3">
      {empty ? (
        <p className="rounded-[10px] border border-dashed p-4 text-sm text-muted-foreground">
          Belum ada pesan di percakapan aktif. Kirim pertanyaan di tampilan
          Customer dulu.
        </p>
      ) : (
        <pre
          ref={preview}
          tabIndex={0}
          aria-label="Pratinjau transkrip"
          className="max-h-56 overflow-auto rounded-[10px] border bg-surface-subtle p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]"
        >
          {text}
        </pre>
      )}
      <Button
        onClick={() => void copy()}
        disabled={empty}
        variant="outline"
        className="w-fit"
      >
        {state === "copied" ? (
          <Check className="text-positive" aria-hidden="true" />
        ) : (
          <ClipboardCopy aria-hidden="true" />
        )}
        {state === "copied" ? "Transkrip tersalin" : "Salin transkrip"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state === "copied"
          ? `${conversation.turns.length} pesan beserta label Jev tersalin. Tempel di dokumen atau chat.`
          : state === "manual"
            ? "Browser menolak salin otomatis. Teks sudah dipilih, tekan Ctrl+C atau Cmd+C."
            : ""}
      </p>
    </div>
  );
}
