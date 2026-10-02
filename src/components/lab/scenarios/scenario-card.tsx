import type { ReactNode } from "react";
import { CATEGORY_LABEL, type Scenario } from "@/lib/lab/scenarios";

/** One ready-made demo case: what gets sent and what Jev should do with it. */
export function ScenarioCard({
  scenario,
  select,
  action,
}: {
  scenario: Scenario;
  /** Optional selection control, e.g. a checkbox with the name as label. */
  select?: ReactNode;
  /** Optional run button. */
  action?: ReactNode;
}) {
  return (
    <article
      aria-labelledby={`scenario-${scenario.id}`}
      className="grid h-full grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border bg-card p-4 has-[input:checked]:border-foreground has-[input:checked]:shadow-[inset_3px_0_0_var(--signal)]"
    >
      <div className="flex items-start justify-between gap-2">
        {select ?? (
          <h3
            id={`scenario-${scenario.id}`}
            className="text-[15px] leading-snug font-semibold"
          >
            {scenario.name}
          </h3>
        )}
        <span className="shrink-0 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold">
          {CATEGORY_LABEL[scenario.category]}
        </span>
      </div>
      <p className="text-sm leading-normal text-foreground/85 [overflow-wrap:anywhere]">
        “{scenario.prompt}”
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Harapan:{" "}
          <strong className="font-semibold text-foreground/85">
            {scenario.expectedIntent}
          </strong>{" "}
          →{" "}
          <strong className="font-semibold text-foreground/85">
            {scenario.expectedRoute}
          </strong>
        </p>
        {action}
      </div>
    </article>
  );
}
