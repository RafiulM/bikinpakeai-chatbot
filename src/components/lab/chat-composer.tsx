import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Message box for the customer widget. Enter sends, Shift+Enter adds a new
 * line, and an IME composition (e.g. while typing with an input method) never
 * sends early. The parent decides what "send" does.
 */
export function ChatComposer({
  onSend,
  busy = false,
  inputRef,
}: {
  onSend: (text: string) => void;
  /** True while a reply is on its way; blocks a second send. */
  busy?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = inputRef ?? fallbackRef;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  function resize() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text) {
      setError("Tulis pertanyaan dulu sebelum mengirim.");
      textareaRef.current?.focus();
      return;
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(
        `Pesan terlalu panjang. Maksimal ${MAX_MESSAGE_LENGTH} karakter.`,
      );
      return;
    }
    if (busy) return;
    onSend(text);
    setValue("");
    setError(null);
    requestAnimationFrame(resize);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    submit();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">
            Pertanyaan Anda
          </label>
          <textarea
            ref={textareaRef}
            id={id}
            name="message"
            rows={1}
            value={value}
            maxLength={MAX_MESSAGE_LENGTH + 200}
            placeholder="Tulis pertanyaan…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${errorId} ${hintId}` : hintId}
            onChange={(event) => {
              setValue(event.target.value);
              if (error && event.target.value.trim()) setError(null);
              resize();
            }}
            onKeyDown={handleKeyDown}
            className="block max-h-40 min-h-12 w-full resize-none rounded-2xl border border-border-strong bg-card px-4 py-3 text-[15px] leading-normal shadow-[0_2px_12px_rgb(0_0_0/5%)] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-danger"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="max-sm:size-12 max-sm:px-0"
        >
          <Send aria-hidden="true" />
          <span className="max-sm:sr-only">{busy ? "Menunggu…" : "Kirim"}</span>
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-danger"
        >
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}
      <p id={hintId} className="sr-only">
        Enter untuk kirim, Shift+Enter untuk baris baru. Nomor kartu disamarkan
        otomatis.
      </p>
    </form>
  );
}
