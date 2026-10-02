import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** One collapsible category of scenarios (disclosure pattern). */
export function CategorySection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="rounded-[20px] border bg-card">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 rounded-[20px] px-5 py-4 text-left"
        >
          <span className="text-[17px] font-semibold">
            {title}{" "}
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              · {count} skenario
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div id={id} hidden={!open} className="border-t px-5 pt-4 pb-5">
        {children}
      </div>
    </section>
  );
}
