import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { buildTranscript, type TranscriptOptions } from "@/lib/lab/transcript";
import type { LabConversation } from "@/lib/lab/types";

type CopyState = "idle" | "copied" | "manual";

/** Copies the labelled transcript, with a preview of exactly what is copied. */
export function CopyTranscript({
  conversation,
  onCopied,
}: {
  conversation: Pick<LabConversation, "code" | "title" | "turns">;
  /** Called with the number of messages once the text is on the clipboard. */
  onCopied?: (messages: number) => void;
}) {
  const id = useId();
  const [state, setState] = useState<CopyState>("idle");
  const [format, setFormat] = useState<"text" | "markdown">("text");
  const [brief, setBrief] = useState(false);
  const [includeBaseline, setIncludeBaseline] = useState(true);
  const preview = useRef<HTMLPreElement>(null);
  const options = useMemo<TranscriptOptions>(
    () => ({ format, labels: brief ? "brief" : "full", includeBaseline }),
    [format, brief, includeBaseline],
  );
  const text = useMemo(
    () => buildTranscript(conversation, options),
    [conversation, options],
  );
  const empty = conversation.turns.length === 0;
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    // Built again so the header time is the moment of copying.
    const fresh = buildTranscript(conversation, options);
    try {
      await navigator.clipboard.writeText(fresh);
      setState("copied");
      onCopied?.(conversation.turns.length);
    } catch {
      // Clipboard blocked: select the preview so Ctrl/Cmd+C still works.
      const node = preview.current;
      if (node) window.getSelection()?.selectAllChildren(node);
      setState("manual");
    }
  }

  const changed = () => setState("idle");
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <SegmentedControl
          legend="Format transkrip"
          value={format}
          onChange={(value) => {
            setFormat(value);
            changed();
          }}
          options={[
            { value: "text", label: "Teks biasa" },
            { value: "markdown", label: "Markdown" },
          ]}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <label htmlFor={`${id}-baseline`} className="flex items-center gap-2">
            <input
              id={`${id}-baseline`}
              type="checkbox"
              checked={includeBaseline}
              onChange={(event) => {
                setIncludeBaseline(event.target.checked);
                changed();
              }}
              className="size-4 accent-foreground"
            />
            Sertakan jawaban tanpa Jev
          </label>
          <label htmlFor={`${id}-brief`} className="flex items-center gap-2">
            <input
              id={`${id}-brief`}
              type="checkbox"
              checked={brief}
              onChange={(event) => {
                setBrief(event.target.checked);
                changed();
              }}
              className="size-4 accent-foreground"
            />
            Label ringkas
          </label>
        </div>
      </div>
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
        {state === "copied" ? "Tersalin" : "Salin transkrip"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {state === "manual"
          ? "Browser menolak salin otomatis. Teks sudah dipilih, tekan Ctrl+C atau Cmd+C."
          : ""}
      </p>
    </div>
  );
}
