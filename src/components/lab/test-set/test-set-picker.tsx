import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TestSetSummary } from "@/lib/lab/types";

/** Native radio group of test sets; arrow keys move between them. */
export function TestSetPicker({
  sets,
  value,
  onChange,
  disabled,
  extraOption,
}: {
  sets: TestSetSummary[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Optional last option, e.g. "upload your own". */
  extraOption?: ReactNode;
}) {
  if (sets.length === 0 && !extraOption)
    return (
      <p className="rounded-[10px] border border-dashed p-4 text-sm text-muted-foreground">
        Belum ada test set. Unggah berkas pesan berlabel untuk memulai.
      </p>
    );
  return (
    <fieldset disabled={disabled} className="m-0 grid gap-2 border-0 p-0">
      <legend className="sr-only">Test set</legend>
      {sets.map((set) => (
        <TestSetOption
          key={set.id}
          name="test-set"
          value={set.id}
          checked={value === set.id}
          onChange={() => onChange(set.id)}
          title={set.name}
          badge={`${set.caseCount} pesan`}
          meta={set.categories.join(", ")}
          description={set.description}
        />
      ))}
      {extraOption}
    </fieldset>
  );
}

export function TestSetOption({
  name,
  value,
  checked,
  onChange,
  title,
  badge,
  meta,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  badge: string;
  meta?: string;
  description?: string;
}) {
  return (
    <label
      className={cn(
        "grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 rounded-[10px] border px-4 py-3 transition-colors hover:border-border-strong",
        "has-[:checked]:border-foreground has-[:checked]:bg-canvas-warm has-[:disabled]:cursor-not-allowed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-[18px] accent-foreground focus-visible:outline-none"
      />
      <span className="text-[15px] leading-snug font-semibold">{title}</span>
      <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
        {badge}
      </span>
      {description && (
        <span className="col-start-2 col-end-4 text-sm text-muted-foreground">
          {description}
        </span>
      )}
      {meta && (
        <span className="col-start-2 col-end-4 text-xs text-muted-foreground">
          {meta}
        </span>
      )}
    </label>
  );
}
