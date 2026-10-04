import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { JevLogo, ModelLogo, modelName } from "@/components/lab/model-logos";
import type { AgentConfig, OpenRouterKeySource } from "@/lib/lab/types";
import { ConfigPanel } from "./config-panel";

const SOURCE_NOTE: Record<OpenRouterKeySource, string> = {
  account: "Memakai kunci OpenRouter akun ini.",
  server: "Memakai kunci OpenRouter server.",
  none: "Mode lokal: belum ada kunci OpenRouter, jadi tidak ada model yang dipanggil. Jawaban diambil langsung dari satu dokumen yang paling cocok.",
};

const number = (value: number) => value.toLocaleString("id-ID");

/** Which model plays which role, and the settings every answer shares. */
export function ModelsPanel({ config }: { config: AgentConfig }) {
  const { models, answer } = config;
  const thinking = `+${number(answer.reasoningTokens)} token penalaran`;
  const roles = [
    {
      key: "jev",
      role: "Jev",
      task: "Membaca setiap pesan: produk, jenis masalah, urgensi, frustrasi, dan data sensitif.",
      modelId: models.jev,
      detail: "Klasifikasi",
      jev: true,
    },
    {
      key: "fast",
      role: "Model cepat",
      task: "Pertanyaan umum yang jawabannya ada di dokumentasi.",
      modelId: models.fast,
      detail: "Tanpa penalaran",
    },
    {
      key: "reasoning",
      role: "Model penalaran",
      task: "Masalah teknis (bug) yang butuh langkah demi langkah.",
      modelId: models.reasoning,
      detail: thinking,
    },
    {
      key: "baseline",
      role: "Tanpa Jev",
      task: "Pembanding: satu model menjawab semua pesan.",
      modelId: models.baseline,
      detail: thinking,
    },
  ];

  return (
    <ConfigPanel description="Model diatur lewat variabel lingkungan server, sama untuk semua akun.">
      <ul className="grid gap-2 md:grid-cols-2">
        {roles.map((item) => (
          <li
            key={item.key}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[12px] border p-3"
          >
            <span className="flex -space-x-1 pt-0.5" aria-hidden="true">
              {item.jev ? <JevLogo /> : <ModelLogo modelId={item.modelId} />}
            </span>
            <div className="grid min-w-0 gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold">{item.role}</span>
                <span className="text-xs text-muted-foreground">
                  {item.detail}
                </span>
              </div>
              <p className="grid text-sm">
                {item.jev ? item.modelId : modelName(item.modelId)}
                {!item.jev && (
                  <code className="font-mono text-xs break-all text-muted-foreground">
                    {item.modelId}
                  </code>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{item.task}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <dl className="contents text-sm">
          <div className="rounded-[10px] bg-surface-subtle p-3">
            <dt className="text-xs text-muted-foreground">Batas jawaban</dt>
            <dd className="font-semibold tabular-nums">
              {number(answer.maxOutputTokens)} token
            </dd>
          </div>
          <div className="rounded-[10px] bg-surface-subtle p-3">
            <dt className="text-xs text-muted-foreground">
              Suhu (temperature)
            </dt>
            <dd className="font-semibold tabular-nums">
              {answer.temperature.toLocaleString("id-ID")}
            </dd>
          </div>
        </dl>
        <p
          data-source={config.source}
          className="flex items-start gap-2 rounded-[10px] border border-dashed p-3 text-sm max-md:col-span-full"
        >
          <KeyRound
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span>
            {SOURCE_NOTE[config.source]}{" "}
            <Link
              to="/pengaturan"
              className="font-semibold underline underline-offset-3"
            >
              Atur kunci di Pengaturan
            </Link>
          </span>
        </p>
      </div>
    </ConfigPanel>
  );
}
