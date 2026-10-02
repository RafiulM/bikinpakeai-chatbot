import { useId, useState, type FormEvent } from "react";
import { AlertCircle, CheckCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_REPLY = 2000;

/** Agent reply box. "Kirim & tutup" answers and closes the ticket in one step. */
export function ReplyForm({
  disabled,
  onSend,
}: {
  /** True for a closed ticket. */
  disabled: boolean;
  onSend: (content: string, closeAfter: boolean) => void;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const content = value.trim();
    if (!content) {
      setError("Tulis balasan dulu sebelum mengirim.");
      return;
    }
    if (content.length > MAX_REPLY) {
      setError(`Balasan terlalu panjang. Maksimal ${MAX_REPLY} karakter.`);
      return;
    }
    onSend(content, submitter?.value === "close");
    setValue("");
    setError(null);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="grid gap-2 border-t pt-5"
    >
      <label htmlFor={id} className="text-[15px] font-semibold">
        Balas pelanggan
      </label>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          if (error && event.target.value.trim()) setError(null);
        }}
        placeholder="Tulis balasan untuk pelanggan…"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="min-h-24 w-full resize-y rounded-2xl border border-border-strong bg-card px-4 py-3 text-[15px] leading-normal outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-danger"
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-danger"
        >
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {disabled
            ? "Tiket ditutup. Pilih “Buka lagi” untuk membalas."
            : "Balasan muncul di percakapan pelanggan."}
        </p>
        <div className="flex flex-wrap gap-2 max-sm:w-full [&>*]:max-sm:flex-1">
          <Button
            type="submit"
            value="send"
            variant="outline"
            disabled={disabled}
          >
            <Send aria-hidden="true" />
            Kirim balasan
          </Button>
          <Button type="submit" value="close" disabled={disabled}>
            <CheckCheck aria-hidden="true" />
            Kirim &amp; tutup
          </Button>
        </div>
      </div>
    </form>
  );
}
