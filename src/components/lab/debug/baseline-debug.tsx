import type { ReactNode } from "react";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSeconds, formatUsd } from "@/lib/lab/format";
import type { ConversationTurn } from "@/lib/lab/types";
import { IssueList } from "../answer-highlight";
import { VerdictLabel } from "../side-by-side";
import { PanelSection } from "./analysis-panel";
import { DecisionTag } from "./decision-tag";

/**
 * What the comparison path did for one message: no reading, no rules and no
 * verification, just one model call. Failures show their stored reason.
 */
export function BaselineDebug({ turn }: { turn: ConversationTurn }) {
  const response = turn.withoutJev;
  const failure = turn.answerFailures?.without_jev;
  const modelId = response?.modelId ?? failure?.modelId ?? null;
  const latencyMs = response?.latencyMs ?? failure?.latencyMs;

  return (
    <div className="grid gap-6">
      {failure && !response && (
        <div
          role="alert"
          className="grid gap-1 rounded-[10px] border border-danger/35 bg-danger/8 px-4 py-3"
        >
          <p className="flex items-center gap-2 text-[15px] font-semibold text-danger-text">
            <AlertTriangle className="size-5" aria-hidden="true" />
            Tidak ada jawaban
          </p>
          <p className="text-sm">{failure.error}</p>
        </div>
      )}
      {!failure && !response && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Menunggu jawaban…
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSection title="Alur proses">
          <ol className="grid gap-3">
            <Step index={1} name="Klasifikasi" />
            <Step index={2} name="Aturan backend" />
            <Step
              index={3}
              name="Model"
              note={modelId ?? "Belum dipanggil"}
              value={
                failure && !response
                  ? "Gagal"
                  : latencyMs !== undefined
                    ? `${latencyMs} ms`
                    : "…"
              }
              failed={Boolean(failure && !response)}
            />
            <Step index={4} name="Verifikasi draf" />
          </ol>
        </PanelSection>

        <PanelSection title="Model & biaya">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
            <Fact label="Model">
              <code className="font-mono text-[13px] [overflow-wrap:anywhere]">
                {modelId ?? "—"}
              </code>
            </Fact>
            <Fact label="Token">
              {response
                ? `${response.inputTokens ?? 0} masuk · ${response.outputTokens ?? 0} keluar`
                : "—"}
            </Fact>
            <Fact label="Waktu">
              {latencyMs !== undefined ? formatSeconds(latencyMs) : "—"}
            </Fact>
            <Fact label="Biaya">
              {response ? formatUsd(response.costUsd) : "—"}
            </Fact>
          </dl>
        </PanelSection>

        <PanelSection title="Dikirim ke model">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
            <Fact label="Instruksi">Kebijakan + seluruh dokumentasi</Fact>
            <Fact label="Pesan">Teks asli pelanggan</Fact>
          </dl>
          {turn.message.isMasked && (
            <p className="flex items-start gap-1.5 text-sm font-medium text-danger-text">
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              Nomor kartu ikut terkirim tanpa disamarkan.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Jalur Jev: dokumen relevan saja, teks sudah disamarkan.
          </p>
        </PanelSection>

        <PanelSection title="Penilaian">
          {response ? (
            <div className="grid gap-2 text-sm">
              <VerdictLabel response={response} />
              <IssueList issues={response.review.issues} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum dinilai.</p>
          )}
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {turn.analysis ? (
              <>
                <span>Standar: keputusan Jev</span>
                <DecisionTag decision={turn.analysis.decision} />
              </>
            ) : (
              <span>Standar: pembacaan cadangan (Jev gagal)</span>
            )}
          </p>
        </PanelSection>
      </div>
    </div>
  );
}

/** One pipeline step; steps the baseline does not have read "Dilewati". */
function Step({
  index,
  name,
  note,
  value,
  failed = false,
}: {
  index: number;
  name: string;
  note?: string;
  value?: string;
  failed?: boolean;
}) {
  const skipped = value === undefined;
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full border text-xs font-semibold",
          skipped
            ? "border-dashed text-muted-foreground"
            : "border-border-strong text-foreground/80",
        )}
      >
        {index}
      </span>
      <span
        className={cn("grid leading-tight", skipped && "text-muted-foreground")}
      >
        {name}
        <small className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {skipped ? "Dilewati" : note}
        </small>
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          failed ? "font-semibold text-danger-text" : "text-foreground/80",
        )}
      >
        {skipped ? "—" : value}
      </span>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </>
  );
}
