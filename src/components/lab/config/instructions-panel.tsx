import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { MODE_LABEL } from "@/components/lab/side-by-side";
import type { ConfigTab } from "@/lib/lab/search";
import type { AgentConfig, ResponseMode } from "@/lib/lab/types";
import { ConfigPanel } from "./config-panel";
import { estimateTokens } from "./knowledge-browser";

const MARKER = /(\{\{[^}]+\}\})/;
const number = (value: number) => value.toLocaleString("id-ID");

const AFTER: Record<ResponseMode, string> = {
  with_jev:
    "Setelah instruksi: pertukaran sebelumnya yang sudah dijawab, lalu pesan pelanggan yang data sensitifnya sudah disamarkan. Dipakai hanya saat rute memilih model; rute template tidak memanggil model.",
  without_jev:
    "Setelah instruksi: pertukaran sebelumnya yang sudah dijawab, lalu pesan pelanggan apa adanya. Dipakai untuk setiap pesan.",
};

/**
 * The system instructions each path sends, with the policy and documents as
 * labelled slots that open their own tabs, beside how the documents are
 * picked.
 */
export function InstructionsPanel({ config }: { config: AgentConfig }) {
  const [path, setPath] = useState<ResponseMode>("with_jev");
  const { knowledge, answer } = config;
  const slot: Record<string, { label: string; tab: ConfigTab }> = {
    "{{kebijakan}}": {
      label: `Kebijakan support · ${config.policy.length} aturan`,
      tab: "kebijakan",
    },
    "{{dokumentasi}}": {
      label:
        path === "with_jev"
          ? `Maks. ${answer.docLimit} dokumen yang cocok`
          : `Semua ${knowledge.length} dokumen`,
      tab: "dokumen",
    },
  };

  return (
    <ConfigPanel
      description="Teks yang diterima model sebelum pesan pelanggan, dan dokumen mana yang mengisinya."
      action={
        <SegmentedControl
          legend="Jalur jawaban"
          value={path}
          onChange={setPath}
          options={[
            { value: "with_jev", label: MODE_LABEL.with_jev },
            { value: "without_jev", label: MODE_LABEL.without_jev },
          ]}
        />
      }
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <pre
            aria-label={`Instruksi sistem ${MODE_LABEL[path]}`}
            className="overflow-x-auto rounded-[12px] bg-surface-subtle p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
          >
            {config.instructions[path].split(MARKER).map((part, index) => {
              const filled = slot[part];
              if (!filled) return <Fragment key={index}>{part}</Fragment>;
              return (
                <Link
                  key={index}
                  to="/konfigurasi"
                  search={(prev) => ({ ...prev, tab: filled.tab })}
                  replace
                  resetScroll={false}
                  className="inline-flex rounded-full border border-signal/40 bg-signal-soft px-2 py-px font-sans text-xs font-semibold text-signal-text no-underline hover:border-signal"
                >
                  {filled.label}
                </Link>
              );
            })}
          </pre>
          <p className="text-xs text-muted-foreground">{AFTER[path]}</p>
        </div>

        <section aria-labelledby="doc-selection-title" className="grid gap-2">
          <h3 id="doc-selection-title" className="text-sm font-semibold">
            Cara dokumen dipilih
          </h3>
          <ul className="grid gap-2 text-sm">
            <li className="grid gap-1 rounded-[12px] border p-3">
              <span className="font-semibold">Dengan Jev</span>
              <span className="text-foreground/80">
                Maks. {answer.docLimit} dokumen yang kata kuncinya cocok dengan
                pesan dan pesan sebelumnya; produk yang dibaca Jev menang saat
                seri. Tidak ada yang cocok: semua dokumen produk itu. Produk
                belum diketahui: semua dokumen.
              </span>
            </li>
            <li className="grid gap-1 rounded-[12px] border p-3">
              <span className="font-semibold">Tanpa Jev</span>
              <span className="text-foreground/80">
                Semua {knowledge.length} dokumen di setiap pesan,{" "}
                <span title="Perkiraan kasar: sekitar 4 karakter per token">
                  ≈ {number(estimateTokens(knowledge))} token
                </span>{" "}
                sebelum pesan pelanggan.
              </span>
            </li>
            <li className="grid gap-1 rounded-[12px] border p-3">
              <span className="font-semibold">Mode lokal</span>
              <span className="text-foreground/80">
                Tanpa kunci OpenRouter, jawabannya adalah isi satu dokumen yang
                paling cocok, apa adanya.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </ConfigPanel>
  );
}
