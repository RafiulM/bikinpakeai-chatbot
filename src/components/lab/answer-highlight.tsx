import { Check, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitHighlight } from "@/lib/lab/compare";

/**
 * Marks the phrase that makes an answer good or bad. The marks carry a text
 * label for screen readers, so meaning never depends on color alone.
 */
export function HighlightedAnswer({
  text,
  phrase,
  tone,
  enabled,
}: {
  text: string;
  phrase?: string;
  tone: "good" | "bad";
  enabled: boolean;
}) {
  const parts = splitHighlight(text, phrase);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts.before}
      <mark
        className={cn(
          "rounded-[4px] px-0.5 text-inherit",
          !enabled && "bg-transparent",
          enabled &&
            tone === "good" &&
            "bg-positive/12 shadow-[inset_0_-2px_0_rgb(35_164_12/60%)]",
          enabled &&
            tone === "bad" &&
            "bg-danger/14 shadow-[inset_0_-2px_0_rgb(203_92_91/70%)]",
        )}
      >
        {enabled && (
          <span className="sr-only">
            {tone === "good" ? "Bagian kuat: " : "Bagian bermasalah: "}
          </span>
        )}
        {parts.match}
      </mark>
      {parts.after}
    </>
  );
}

export function BetterBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
      <Check className="size-3.5" aria-hidden="true" />
      Lebih baik
    </span>
  );
}

export function IssueList({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul aria-label="Masalah pada jawaban" className="grid gap-1.5">
      {issues.map((issue) => (
        <li
          key={issue}
          className="flex items-start gap-1.5 text-sm font-medium text-danger-text"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {issue}
        </li>
      ))}
    </ul>
  );
}
