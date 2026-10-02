import {
  Ban,
  GitBranch,
  Headset,
  HelpCircle,
  Lock,
  MessageCircleReply,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Decision, JevAnalysis } from "@/lib/lab/types";

const DECISION_STYLE: Record<
  Decision,
  { label: string; icon: LucideIcon; tone: string; summary: string }
> = {
  answered: {
    label: "Dijawab biasa",
    icon: MessageCircleReply,
    tone: "border-positive/30 bg-positive/8 text-positive-text",
    summary:
      "Tidak ada risiko; pesan dijawab oleh penangan termurah yang cocok.",
  },
  masked: {
    label: "Data disamarkan",
    icon: Lock,
    tone: "border-warning/40 bg-warning/10 text-warning-text",
    summary: "Data sensitif disamarkan sebelum diteruskan ke model mana pun.",
  },
  blocked: {
    label: "Diblokir",
    icon: Ban,
    tone: "border-danger/35 bg-danger/8 text-danger-text",
    summary: "Upaya prompt injection diblokir dan dicatat.",
  },
  escalated: {
    label: "Dieskalasi ke manusia",
    icon: Headset,
    tone: "border-danger/35 bg-danger/8 text-danger-text",
    summary: "Kasus diteruskan ke tim support manusia lewat tiket.",
  },
  clarify: {
    label: "Minta klarifikasi",
    icon: HelpCircle,
    tone: "border-warning/40 bg-warning/10 text-warning-text",
    summary: "Pesan kurang jelas, jadi Jev bertanya balik dulu.",
  },
};

/** Why Jev answered, masked, blocked, escalated, or asked back. */
export function DecisionReason({ analysis }: { analysis: JevAnalysis }) {
  const style = DECISION_STYLE[analysis.decision];
  const Icon = style.icon;
  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-[10px] border px-4 py-3",
          style.tone,
        )}
      >
        <Icon className="row-span-2 mt-0.5 size-5" aria-hidden="true" />
        <p className="text-[15px] font-semibold">{style.label}</p>
        <p className="text-sm text-foreground/80">{style.summary}</p>
      </div>
      <p className="text-[15px] leading-relaxed">{analysis.routeReason}</p>
      <ul aria-label="Aturan yang terpicu" className="grid gap-2 text-sm">
        {analysis.rules.map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <GitBranch
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
