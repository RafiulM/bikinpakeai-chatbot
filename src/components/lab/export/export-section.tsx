import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** One way to take results out of the lab: what it gives, then the action. */
export function ExportSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid content-start gap-4 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <div className="grid gap-1.5">
        <h2
          id={id}
          className="flex items-center gap-2.5 text-[17px] font-semibold"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-text"
          >
            <Icon className="size-4" />
          </span>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
