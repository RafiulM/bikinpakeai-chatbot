import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labApi } from "@/lib/lab/api-client";
import type { DemoSeedResult, OpenRouterKeySource } from "@/lib/lab/types";

/** Fills the account with demo data made by the real pipeline. */
export function DemoDataCard({ source }: { source: OpenRouterKeySource }) {
  const id = useId();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DemoSeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await labApi.seedDemo());
    } catch {
      setError("Data demo gagal dibuat. Coba lagi.");
    } finally {
      setRunning(false);
    }
  }

  const search = result ? { c: result.conversation.id } : undefined;
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
            <DatabaseZap className="size-4" />
          </span>
          Data demo
        </h2>
        <p className="text-sm text-muted-foreground">
          Membuat percakapan baru dari 7 skenario siap pakai (termasuk data
          sensitif, prompt injection, dan eskalasi ke tiket), lalu menjalankan
          ketiga test set bawaan satu per satu di latar.
        </p>
      </div>
      <p className="rounded-[10px] bg-surface-subtle p-3 text-sm">
        {source === "none"
          ? "Tanpa kunci OpenRouter, data dibuat dalam mode lokal: waktu dan biaya bernilai 0. Simpan kunci dulu untuk hasil sungguhan."
          : "Memakai OpenRouter: skenario butuh sekitar 1–2 menit, ketiga test set beberapa menit lagi, dan pemakaian model ditagih ke kunci."}
      </p>
      <Button onClick={() => void seed()} disabled={running} className="w-fit">
        {running ? "Mengisi data demo…" : "Isi data demo"}
      </Button>
      <div aria-live="polite" className="text-sm">
        {running && <p>Menjalankan skenario lewat kedua jalur…</p>}
        {error && (
          <p role="alert" className="text-danger-text">
            {error}
          </p>
        )}
        {result && (
          <div className="grid gap-2">
            <p>
              Percakapan {result.conversation.code} dibuat: {result.messages}{" "}
              pesan, {result.tickets} tiket
              {result.failed > 0 && `, ${result.failed} gagal`}.{" "}
              {result.testSets.length > 0 &&
                `${result.testSets.join(", ")} sedang diuji di latar.`}
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              <Link to="/compare" search={search} className="underline">
                Buka Chat
              </Link>
              <Link to="/debug" search={search} className="underline">
                Buka Debug
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
