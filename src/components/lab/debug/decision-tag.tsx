import { cn } from "@/lib/utils";
import type { Decision } from "@/lib/lab/types";

const DECISION: Record<Decision, { label: string; tone: string }> = {
  answered: {
    label: "Dijawab biasa",
    tone: "border-positive/30 bg-positive/10 text-positive-text",
  },
  masked: {
    label: "Disamarkan",
    tone: "border-warning/40 bg-warning/12 text-warning-text",
  },
  blocked: {
    label: "Diblokir",
    tone: "border-danger/35 bg-danger/10 text-danger-text",
  },
  escalated: {
    label: "Dieskalasi",
    tone: "border-danger/35 bg-danger/10 text-danger-text",
  },
  clarify: {
    label: "Minta klarifikasi",
    tone: "border-warning/40 bg-warning/12 text-warning-text",
  },
};

/** What Jev decided for a message, as text plus tone (never color alone). */
export function DecisionTag({
  decision,
  long = false,
}: {
  decision: Decision;
  long?: boolean;
}) {
  const { label, tone } = DECISION[decision];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tone,
      )}
    >
      {long && decision === "escalated" ? "Dieskalasi ke manusia" : label}
    </span>
  );
}
