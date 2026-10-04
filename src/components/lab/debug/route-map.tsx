import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CircleHelp,
  Cpu,
  FileText,
  GitBranch,
  Headset,
  History,
  Lock,
  MessageSquareText,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSeconds, formatUsd } from "@/lib/lab/format";
import { SUPPORT_POLICY } from "@/lib/lab/policy";
import {
  HANDLER_ROUTES,
  type ConversationTurn,
  type HandlerRoute,
  type HandlerTrace,
  type JevAnalysis,
  type TemplateId,
} from "@/lib/lab/types";
import { DecisionTag } from "./decision-tag";

const ROUTE: Record<
  HandlerRoute,
  { label: string; hint: string; icon: LucideIcon }
> = {
  template: {
    label: "Template",
    hint: "Jawaban siap pakai, hampir tanpa biaya",
    icon: FileText,
  },
  fast_model: {
    label: "Model cepat",
    hint: "Model murah + FAQ & dokumentasi",
    icon: Zap,
  },
  reasoning_model: {
    label: "Model penalaran",
    hint: "Model penalaran untuk masalah teknis",
    icon: Brain,
  },
  escalate: {
    label: "Eskalasi",
    hint: "Diteruskan ke tim support manusia",
    icon: Headset,
  },
  clarify: {
    label: "Klarifikasi",
    hint: "Bertanya balik saat pesan kurang jelas",
    icon: CircleHelp,
  },
};

const TEMPLATE_LABEL: Record<TemplateId, string> = {
  blocked: "Template penolakan",
  masked: "Template keamanan data",
  escalated: "Template eskalasi",
  clarify: "Template klarifikasi",
  feature: "Template saran fitur",
  safeFallback: "Template aman",
};

const POLICY_LINES = SUPPORT_POLICY.split("\n");
const number = (value: number) => value.toLocaleString("id-ID");

/**
 * The path one message took through the Jev pipeline, then exactly what the
 * chosen handler was given (context) and what ran it (model and settings).
 */
export function RouteMap({
  turn,
  analysis,
}: {
  turn: ConversationTurn;
  analysis: JevAnalysis;
}) {
  const handler = analysis.handler ?? null;
  return (
    <div className="grid gap-5">
      <RouteFlow turn={turn} analysis={analysis} />
      <div className="grid gap-4 md:grid-cols-2">
        <ContextStack handler={handler} masked={turn.message.isMasked} />
        <HandlerModel turn={turn} analysis={analysis} handler={handler} />
      </div>
    </div>
  );
}

/** Message → Jev → rules → handler → verification, chosen branch lit. */
function RouteFlow({
  turn,
  analysis,
}: {
  turn: ConversationTurn;
  analysis: JevAnalysis;
}) {
  const verify = analysis.steps.find((step) => step.name === "Verifikasi draf");
  const replaced =
    Boolean(analysis.handler?.fallback) ||
    (verify !== undefined && verify.note !== "Lolos");
  const history = analysis.handler?.history ?? 0;
  const [firstRule, ...otherRules] = analysis.rules;

  return (
    <ol
      aria-label="Alur penanganan pesan"
      className="grid gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      <FlowNode step={1} icon={MessageSquareText} title="Pesan masuk">
        {turn.message.isMasked ? (
          <Chip tone="warning" icon={Lock}>
            Disamarkan
          </Chip>
        ) : (
          <Chip tone="neutral">Teks asli</Chip>
        )}
        <Note>
          {turn.message.isMasked
            ? "Data sensitif diganti sebelum sampai ke model."
            : "Tidak ada data sensitif yang perlu disamarkan."}
        </Note>
        {history > 0 && (
          <Note>
            <History
              className="inline size-3 align-[-2px]"
              aria-hidden="true"
            />{" "}
            +{history} pesan sebelumnya ikut dibaca
          </Note>
        )}
      </FlowNode>

      <FlowNode step={2} icon={ScanSearch} title="Jev membaca">
        <ModelId id={analysis.reader?.modelId ?? null} fallback="Model Jev" />
        <Note>
          1 panggilan · yakin {Math.round(analysis.confidence * 100)}%
          {analysis.reader ? ` · ${number(analysis.reader.latencyMs)} ms` : ""}
        </Note>
      </FlowNode>

      <FlowNode step={3} icon={GitBranch} title="Aturan backend">
        <div>
          <DecisionTag decision={analysis.decision} />
        </div>
        {firstRule && <Note>{firstRule}</Note>}
        {otherRules.length > 0 && (
          <Note>+{otherRules.length} aturan lain terpicu</Note>
        )}
      </FlowNode>

      <FlowNode step={4} icon={Cpu} title="Penangan" active>
        <ul aria-label="Pilihan penangan" className="grid gap-1">
          {HANDLER_ROUTES.map((route) => {
            const chosen = route === analysis.route;
            const { label, hint, icon: Icon } = ROUTE[route];
            return (
              <li
                key={route}
                title={hint}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] border px-2 py-1 text-[13px]",
                  chosen
                    ? "border-signal bg-signal-soft font-semibold text-foreground"
                    : "border-transparent text-muted-foreground/80",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {chosen && (
                  <>
                    <Check
                      className="size-3.5 shrink-0 text-signal-text"
                      aria-hidden="true"
                    />
                    <span className="sr-only"> (terpilih)</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </FlowNode>

      <FlowNode step={5} icon={ShieldCheck} title="Verifikasi draf" last>
        {!verify ? (
          <Note>Belum tercatat.</Note>
        ) : replaced ? (
          <>
            <Chip tone="danger" icon={TriangleAlert}>
              Diganti
            </Chip>
            <Note>{analysis.handler?.fallback ?? verify.note}</Note>
          </>
        ) : (
          <>
            <Chip tone="positive" icon={Check}>
              Lolos
            </Chip>
            <Note>
              Tanpa nomor kartu, bocoran instruksi, kode promo, atau janji
              refund.
            </Note>
          </>
        )}
      </FlowNode>
    </ol>
  );
}

function FlowNode({
  step,
  icon: Icon,
  title,
  active = false,
  last = false,
  children,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  active?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "relative grid content-start gap-2 rounded-[14px] border p-3",
        active ? "border-signal/50 bg-card shadow-sm" : "bg-surface-subtle",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-[8px]",
            active
              ? "bg-signal-soft text-signal-text"
              : "bg-card text-foreground/70",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {step}/5
        </span>
      </div>
      <p className="text-[13px] leading-tight font-semibold">{title}</p>
      {children}
      {!last && (
        <ArrowRight
          aria-hidden="true"
          className="absolute size-4 text-border-strong max-lg:-bottom-5 max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:rotate-90 lg:top-1/2 lg:-right-5 lg:-translate-y-1/2"
        />
      )}
    </li>
  );
}

/** The layers of the handler's prompt, in order; unused layers are dashed. */
function ContextStack({
  handler,
  masked,
}: {
  handler: HandlerTrace | null;
  masked: boolean;
}) {
  return (
    <section
      aria-labelledby="route-context-title"
      className="grid content-start gap-3 rounded-[14px] border p-4"
    >
      <div className="grid gap-0.5">
        <h4 id="route-context-title" className="text-[15px] font-semibold">
          Konteks yang dipakai
        </h4>
        <p className="text-xs text-muted-foreground">
          Apa saja yang dikirim ke penangan, berurutan.
        </p>
      </div>
      {!handler ? (
        <p className="rounded-[10px] border border-dashed p-3 text-sm text-muted-foreground">
          Belum tercatat untuk pesan ini. Pesan baru akan menampilkan konteks
          yang dipakai penangannya.
        </p>
      ) : handler.kind === "template" ? (
        <ul className="grid gap-2">
          <Layer
            icon={FileText}
            title={TEMPLATE_LABEL[handler.template ?? "safeFallback"]}
            active
          >
            Balasan tetap yang sudah disetujui. Tidak ada konteks yang dikirim
            ke model mana pun.
          </Layer>
          <Layer icon={ScrollText} title="Kebijakan support">
            Tidak dikirim
          </Layer>
          <Layer icon={BookOpen} title="Dokumentasi">
            Tidak dikirim
          </Layer>
          <Layer icon={MessageSquareText} title="Pesan pelanggan">
            Tidak dikirim
          </Layer>
        </ul>
      ) : (
        <ul className="grid gap-2">
          <Layer
            icon={ScrollText}
            title="Kebijakan support"
            active={handler.policy}
          >
            {handler.policy ? (
              <details className="group">
                <summary className="cursor-pointer list-none text-signal-text underline-offset-3 hover:underline [&::-webkit-details-marker]:hidden">
                  {POLICY_LINES.length} aturan
                  <span className="group-open:hidden"> · lihat</span>
                  <span className="hidden group-open:inline"> · tutup</span>
                </summary>
                <ol className="mt-2 grid list-decimal gap-1 pl-4 text-foreground/80">
                  {POLICY_LINES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </details>
            ) : (
              "Tidak dikirim (mode lokal tidak memakai model)"
            )}
          </Layer>
          <Layer
            icon={BookOpen}
            title={
              handler.docScope === "all"
                ? `Dokumentasi · semua ${handler.docs.length} entri`
                : handler.docScope === "product"
                  ? `Dokumentasi · ${handler.docs.length} entri ${handler.docs[0]?.product ?? ""}`
                  : `Dokumentasi · ${handler.docs.length} relevan`
            }
            active={handler.docs.length > 0}
          >
            {handler.docs.length === 0 ? (
              "Tidak ada dokumen yang cocok"
            ) : (
              <>
                {handler.docScope === "all" && (
                  <span className="mb-1.5 block">
                    Tidak ada kata kunci yang cocok, jadi seluruh dokumentasi
                    dikirim.
                  </span>
                )}
                {handler.docScope === "product" && (
                  <span className="mb-1.5 block">
                    Tidak ada kata kunci yang cocok, jadi hanya dokumentasi
                    produk yang dibaca Jev yang dikirim.
                  </span>
                )}
                <span className="flex flex-wrap gap-1.5">
                  {handler.docs.map((doc) => (
                    <Link
                      key={doc.id}
                      to="/konfigurasi"
                      search={{ tab: "dokumen", doc: doc.id }}
                      title={`Buka dokumen ${doc.id}`}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs text-foreground transition-colors hover:border-signal"
                    >
                      <span className="font-semibold">{doc.product}</span>
                      <span className="truncate text-foreground/80">
                        {doc.topic}
                      </span>
                    </Link>
                  ))}
                </span>
              </>
            )}
          </Layer>
          <Layer
            icon={History}
            title="Riwayat percakapan"
            active={handler.history > 0}
          >
            {handler.history > 0
              ? `${handler.history} pertukaran sebelumnya`
              : "Tidak ada (pesan pertama atau mode lokal)"}
          </Layer>
          <Layer icon={MessageSquareText} title="Pesan pelanggan" active>
            {handler.maskedInput || masked ? (
              <span className="inline-flex items-center gap-1 font-medium text-warning-text">
                <Lock className="size-3" aria-hidden="true" />
                Teks yang sudah disamarkan
              </span>
            ) : (
              "Teks pelanggan apa adanya"
            )}
          </Layer>
        </ul>
      )}
    </section>
  );
}

function Layer({
  icon: Icon,
  title,
  active = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-[10px] border-l-[3px] px-3 py-2 text-sm",
        active
          ? "border-l-signal bg-surface-subtle"
          : "border border-l-[3px] border-dashed border-l-border text-muted-foreground",
      )}
    >
      <Icon
        className={cn(
          "row-span-2 mt-0.5 size-4",
          active ? "text-signal-text" : "",
        )}
        aria-hidden="true"
      />
      <span className={cn("font-medium", active && "text-foreground")}>
        {title}
        {!active && <span className="sr-only"> (tidak dipakai)</span>}
      </span>
      <span className="text-xs text-muted-foreground">{children}</span>
    </li>
  );
}

/** Which model wrote the answer, its settings, tokens, time and cost. */
function HandlerModel({
  turn,
  analysis,
  handler,
}: {
  turn: ConversationTurn;
  analysis: JevAnalysis;
  handler: HandlerTrace | null;
}) {
  const kind = handler?.kind ?? (turn.withJev?.modelId ? "model" : "template");
  const route = ROUTE[analysis.route];
  const thinking = handler
    ? handler.reasoningTokens > 0
    : analysis.route === "reasoning_model";
  const heading =
    kind === "template"
      ? "Tanpa model"
      : kind === "local"
        ? "Mode lokal"
        : thinking
          ? "Model penalaran"
          : "Model cepat";
  const Icon =
    kind === "template"
      ? FileText
      : kind === "local"
        ? Cpu
        : thinking
          ? Brain
          : Zap;
  const modelId = handler?.modelId ?? turn.withJev?.modelId ?? null;

  return (
    <section
      aria-labelledby="route-model-title"
      className="grid content-start gap-3 rounded-[14px] border p-4"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3">
        <span className="row-span-2 grid size-10 place-items-center rounded-[10px] bg-signal-soft text-signal-text">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h4 id="route-model-title" className="text-[15px] font-semibold">
          {heading}
        </h4>
        {kind === "template" ? (
          <p className="text-xs text-muted-foreground">
            {handler?.template
              ? TEMPLATE_LABEL[handler.template]
              : analysis.routeLabel}{" "}
            · 0 token
          </p>
        ) : (
          <ModelId id={modelId} fallback="Model tidak tercatat" />
        )}
      </div>

      {handler?.fallback && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-[10px] border border-danger/35 bg-danger/8 px-3 py-2 text-sm text-danger-text"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {handler.fallback}
        </p>
      )}

      {kind !== "template" && !handler && (
        <p className="rounded-[10px] border border-dashed p-3 text-sm text-muted-foreground">
          Pengaturan, token, dan biaya penangan belum tercatat untuk pesan ini.
        </p>
      )}
      {kind !== "template" && handler && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <Fact label="Penalaran">
            {handler.reasoningTokens > 0
              ? `Aktif · anggaran ${number(handler.reasoningTokens)} token`
              : "Mati"}
          </Fact>
          <Fact label="Batas jawaban">
            {handler.maxOutputTokens
              ? `${number(handler.maxOutputTokens)} token`
              : "—"}
          </Fact>
          <Fact label="Temperatur">
            {handler.temperature !== null
              ? handler.temperature.toLocaleString("id-ID")
              : "—"}
          </Fact>
          <Fact label="Token">
            <TokenBar
              input={handler.inputTokens}
              output={handler.outputTokens}
            />
          </Fact>
          <Fact label="Waktu">{formatSeconds(handler.latencyMs)}</Fact>
          <Fact label="Biaya">{formatUsd(handler.costUsd)}</Fact>
        </dl>
      )}
      <p className="text-xs text-muted-foreground">
        {route.label}: {route.hint}.
      </p>
    </section>
  );
}

function TokenBar({ input, output }: { input: number; output: number }) {
  const total = input + output;
  const inputShare = total ? (input / total) * 100 : 0;
  return (
    <span className="grid gap-1">
      <span>
        {number(input)} masuk · {number(output)} keluar
      </span>
      {total > 0 && (
        <span
          aria-hidden="true"
          className="flex h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className="h-full bg-foreground"
            style={{ width: `${inputShare}%` }}
          />
          <span className="h-full flex-1 bg-signal" />
        </span>
      )}
    </span>
  );
}

function ModelId({ id, fallback }: { id: string | null; fallback: string }) {
  return (
    <code className="font-mono text-[12px] leading-snug text-foreground [overflow-wrap:anywhere]">
      {id ?? fallback}
    </code>
  );
}

function Chip({
  tone,
  icon: Icon,
  children,
}: {
  tone: "neutral" | "warning" | "danger" | "positive";
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tone === "neutral" && "border-border-strong/60 text-foreground/80",
        tone === "warning" &&
          "border-warning/40 bg-warning/12 text-warning-text",
        tone === "danger" && "border-danger/35 bg-danger/10 text-danger-text",
        tone === "positive" &&
          "border-positive/30 bg-positive/10 text-positive-text",
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-snug text-muted-foreground [overflow-wrap:anywhere]">
      {children}
    </p>
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
