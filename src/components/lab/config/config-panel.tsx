import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Body of one Konfigurasi tab. The tab itself names the panel, so this only
 * adds a one-line description and an optional control beside it.
 */
export function ConfigPanel({
  description,
  action,
  className,
  children,
}: {
  description: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 rounded-[20px] border bg-card p-6 max-sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-muted-foreground">{description}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
