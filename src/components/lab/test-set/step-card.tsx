import type { ReactNode } from "react";

/** A numbered step of the test flow: choose, run, read the report. */
export function StepCard({
  step,
  title,
  description,
  id,
  children,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid content-start gap-4 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <div>
        <h2
          id={id}
          className="flex items-center gap-2.5 text-[17px] font-semibold"
        >
          <span
            aria-hidden="true"
            className="grid size-[26px] place-items-center rounded-full bg-foreground text-[13px] text-background"
          >
            {step}
          </span>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
