import { useId, useState, type FormEvent } from "react";
import { KeyRound, PlugZap, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { labApi } from "@/lib/lab/api-client";
import { formatDay } from "@/lib/lab/format";
import type { AiSettings, OpenRouterKeyCheck } from "@/lib/lab/types";

// Same rule as the server check in src/validators/settings.ts.
const KEY_FORMAT = /^sk-or-[A-Za-z0-9_-]{16,200}$/;

const SOURCE_TEXT = {
  account: "Memakai kunci akun ini",
  server: "Memakai kunci server (OPENROUTER_API_KEY)",
  none: "Mode lokal · belum ada kunci",
} as const;

const usd = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;

function checkText(check: OpenRouterKeyCheck) {
  switch (check.status) {
    case "ok":
      return [
        `Kunci diterima OpenRouter${check.label ? ` (${check.label})` : ""}.`,
        `Terpakai ${usd(check.usageUsd)}`,
        check.limitRemainingUsd === null
          ? "tanpa batas kredit"
          : `sisa ${usd(check.limitRemainingUsd)}`,
        check.freeTier ? "akun gratis" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "rejected":
      return "OpenRouter menolak kunci ini. Periksa atau buat kunci baru di openrouter.ai/keys.";
    case "unreachable":
      return "OpenRouter tidak bisa dihubungi sekarang. Periksa koneksi lalu coba lagi.";
    default:
      return "Belum ada kunci untuk diuji.";
  }
}

/** Save, replace, test and remove the account's own OpenRouter key. */
export function OpenRouterKeyCard({
  settings,
  onChange,
}: {
  settings: AiSettings;
  onChange: (settings: AiSettings) => void;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<"save" | "check" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [check, setCheck] = useState<OpenRouterKeyCheck | null>(null);
  const saved = settings.accountKey;

  async function save(event: FormEvent) {
    event.preventDefault();
    const apiKey = value.trim();
    setNotice(null);
    setCheck(null);
    if (!KEY_FORMAT.test(apiKey)) {
      setError("Kunci OpenRouter diawali sk-or- dan tanpa spasi.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      onChange(await labApi.saveOpenRouterKey(apiKey));
      setValue("");
      setNotice(
        "Kunci tersimpan terenkripsi. Percakapan dan uji berikutnya memakai OpenRouter.",
      );
    } catch {
      setError("Kunci gagal disimpan. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("check");
    setNotice(null);
    setError(null);
    try {
      setCheck(await labApi.checkOpenRouterKey());
    } catch {
      setError("Uji koneksi gagal. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setNotice(null);
    setCheck(null);
    try {
      onChange(await labApi.deleteOpenRouterKey());
      setNotice("Kunci akun dihapus.");
    } catch {
      setError("Kunci gagal dihapus. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid content-start gap-4 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <div className="grid gap-1.5">
        <h2
          id={`${id}-title`}
          className="flex items-center gap-2.5 text-[17px] font-semibold"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-signal-soft text-signal-text"
          >
            <KeyRound className="size-4" />
          </span>
          Kunci API OpenRouter
        </h2>
        <p className="text-sm text-muted-foreground">
          Dipakai kedua jalur (dengan dan tanpa Jev) untuk percakapan, tiket,
          dan uji test set di akun ini. Kunci disimpan terenkripsi dan tidak
          pernah ditampilkan lagi.
        </p>
      </div>

      <dl className="grid gap-1 rounded-[10px] bg-surface-subtle p-3 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold">Status:</dt>
          <dd>{SOURCE_TEXT[settings.source]}</dd>
        </div>
        {saved && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold">Kunci akun:</dt>
            <dd className="font-mono">
              sk-or-{saved.hint}
              <span className="font-sans text-muted-foreground">
                {" "}
                · disimpan {formatDay(saved.updatedAt)}
              </span>
            </dd>
          </div>
        )}
        {settings.accountKeyUnreadable && (
          <dd className="text-danger-text">
            Kunci tersimpan tidak bisa dibuka karena rahasia server berubah.
            Simpan ulang kuncinya.
          </dd>
        )}
      </dl>

      <form onSubmit={(event) => void save(event)} className="grid gap-2">
        <label htmlFor={`${id}-key`} className="text-sm font-medium">
          {saved ? "Ganti dengan kunci baru" : "Kunci API"}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${id}-key`}
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="sk-or-v1-…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint`}
            className="h-10 min-w-0 flex-1 basis-64 rounded-full border border-border-strong bg-card px-4 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-danger"
          />
          <Button type="submit" disabled={busy !== null || !value.trim()}>
            {busy === "save" ? "Menyimpan…" : "Simpan kunci"}
          </Button>
        </div>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Buat kunci di{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-3"
          >
            openrouter.ai/keys
          </a>
          . Biaya pemakaian model ditagih ke akun OpenRouter pemilik kunci.
        </p>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void test()}
          disabled={busy !== null || settings.source === "none"}
        >
          <PlugZap aria-hidden="true" />
          {busy === "check" ? "Menguji…" : "Uji koneksi"}
        </Button>
        {saved && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={busy !== null}>
                <Trash2 aria-hidden="true" />
                Hapus kunci
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus kunci OpenRouter?</AlertDialogTitle>
                <AlertDialogDescription>
                  {settings.serverKey
                    ? "Akun ini akan kembali memakai kunci server."
                    : "Akun ini akan kembali ke mode lokal tanpa model sungguhan."}{" "}
                  Kunci di akun OpenRouter kamu tidak ikut terhapus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => void remove()}>
                  Hapus kunci
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div aria-live="polite" className="grid gap-1 text-sm">
        {error && (
          <p role="alert" className="text-danger-text">
            {error}
          </p>
        )}
        {notice && <p>{notice}</p>}
        {check && (
          <p
            className={
              check.status === "ok" ? "text-positive-text" : "text-danger-text"
            }
          >
            {checkText(check)}
          </p>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">
          Model per peran
        </summary>
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          {(
            [
              ["Jev (klasifikasi)", settings.models.jev],
              ["Model cepat", settings.models.fast],
              ["Model penalaran", settings.models.reasoning],
              ["Pembanding tanpa Jev", settings.models.baseline],
            ] as const
          ).map(([role, model]) => (
            <div key={role} className="contents">
              <dt className="text-muted-foreground">{role}</dt>
              <dd className="font-mono text-xs leading-5 [overflow-wrap:anywhere]">
                {model}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Model diatur lewat variabel LAB_*_MODEL di .env.local.
        </p>
      </details>
    </section>
  );
}
