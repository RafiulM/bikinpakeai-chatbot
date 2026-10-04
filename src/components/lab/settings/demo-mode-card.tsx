import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Presentation } from "lucide-react";
import { useDisplaySettings } from "@/components/lab/display-settings";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { MODE_LABEL } from "@/components/lab/side-by-side";
import { labApi } from "@/lib/lab/api-client";
import type { DisplaySettings, ResponseMode } from "@/lib/lab/types";

const CHATBOT_NOTE: Record<ResponseMode, string> = {
  with_jev:
    "Jev membaca pesan, menerapkan aturan, lalu memilih penangan termurah. Bisa meneruskan ke tim support lewat tiket.",
  without_jev:
    "Satu model langsung menjawab dengan dokumentasi dan kebijakan yang sama, tanpa pemeriksaan Jev.",
};

/**
 * Turns demo mode on or off. Off, Chat shows one chatbot (the chosen path)
 * the way a customer sees it, and the lab menu is hidden. Saved per account.
 */
export function DemoModeCard() {
  const id = useId();
  const { settings, setSettings } = useDisplaySettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(next: DisplaySettings) {
    const previous = settings;
    // Switch the layout at once; put it back if saving fails.
    setSettings(next);
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await labApi.saveDisplaySettings(next);
      setSettings(saved);
      setNotice(
        saved.demoMode
          ? "Mode demo aktif. Chat menampilkan kedua jawaban berdampingan."
          : `Mode demo mati. Chat menampilkan chatbot ${MODE_LABEL[saved.chatbot].toLowerCase()}.`,
      );
    } catch {
      setSettings(previous);
      setError("Pengaturan gagal disimpan. Coba lagi.");
    } finally {
      setSaving(false);
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
            <Presentation className="size-4" />
          </span>
          Mode demo
        </h2>
        <p className="text-sm text-muted-foreground">
          Matikan untuk menunjukkan chatbot seperti yang dilihat pelanggan: satu
          jawaban tanpa penilaian, waktu, dan biaya, serta menu alat lab
          disembunyikan.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[10px] bg-surface-subtle p-3">
        <div className="grid gap-0.5 text-sm">
          <span id={`${id}-switch`} className="font-semibold">
            Mode demo
          </span>
          <span id={`${id}-state`} className="text-muted-foreground">
            {settings.demoMode
              ? "Aktif · kedua jawaban berdampingan dengan skor"
              : `Mati · chatbot ${MODE_LABEL[settings.chatbot].toLowerCase()}`}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.demoMode}
          aria-labelledby={`${id}-switch`}
          aria-describedby={`${id}-state`}
          disabled={saving}
          onClick={() =>
            void save({ ...settings, demoMode: !settings.demoMode })
          }
          className="group relative h-6 w-11 shrink-0 rounded-full border bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-60 aria-checked:border-foreground aria-checked:bg-foreground motion-reduce:transition-none"
        >
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0.5 size-[18px] rounded-full bg-card shadow-sm transition-transform group-aria-checked:translate-x-5 motion-reduce:transition-none"
          />
        </button>
      </div>

      <fieldset disabled={saving} className="m-0 grid gap-2 border-0 p-0">
        <p aria-hidden="true" className="text-sm font-medium">
          Chatbot saat mode demo mati
        </p>
        <SegmentedControl
          legend="Chatbot saat mode demo mati"
          options={(["with_jev", "without_jev"] as const).map((mode) => ({
            value: mode,
            label: MODE_LABEL[mode],
          }))}
          value={settings.chatbot}
          onChange={(chatbot) => void save({ ...settings, chatbot })}
        />
        <p className="text-sm text-muted-foreground">
          {CHATBOT_NOTE[settings.chatbot]}
        </p>
      </fieldset>

      <p className="rounded-[10px] bg-surface-subtle p-3 text-sm">
        Kedua jalur tetap berjalan di latar, jadi Debug dan perbandingan tetap
        lengkap saat mode demo dinyalakan lagi. Saat mati, Pengaturan dibuka
        lewat ikon roda gigi di kanan atas.
      </p>

      <div aria-live="polite" className="text-sm">
        {error && (
          <p role="alert" className="text-danger-text">
            {error}
          </p>
        )}
        {notice && (
          <p>
            {notice}{" "}
            <Link to="/compare" className="font-semibold underline">
              Buka Chat
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
