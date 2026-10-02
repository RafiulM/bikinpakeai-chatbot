import { useId } from "react";
import { cn } from "@/lib/utils";

/** Native radio group styled as a pill switch. Arrow keys work out of the box. */
export function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("m-0 border-0 p-0", className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex flex-wrap rounded-full border bg-card p-[3px]">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
            />
            <span className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              {option.label}
              {option.count !== undefined && (
                <b className="font-semibold tabular-nums">{option.count}</b>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
