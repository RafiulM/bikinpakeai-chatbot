import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HANDLER_ROUTES,
  type HandlerRoute,
  type JevAnalysis,
} from "@/lib/lab/types";

export const ROUTE_LABEL: Record<HandlerRoute, string> = {
  template: "Template",
  fast_model: "Model cepat",
  reasoning_model: "Model penalaran",
  escalate: "Eskalasi",
  clarify: "Klarifikasi",
};

const ROUTE_HINT: Record<HandlerRoute, string> = {
  template: "Jawaban siap pakai, hampir tanpa biaya",
  fast_model: "Model murah + FAQ & dokumentasi",
  reasoning_model: "Model penalaran untuk masalah teknis",
  escalate: "Diteruskan ke tim support manusia",
  clarify: "Bertanya balik saat pesan kurang jelas",
};

/** Which handler answered the message, among all the handlers Jev can pick. */
export function RouteChoice({ analysis }: { analysis: JevAnalysis }) {
  return (
    <div className="grid gap-3">
      <p className="text-[15px] font-semibold">{analysis.routeLabel}</p>
      <ul aria-label="Pilihan penangan" className="flex flex-wrap gap-2">
        {HANDLER_ROUTES.map((route) => {
          const chosen = route === analysis.route;
          return (
            <li
              key={route}
              title={ROUTE_HINT[route]}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                chosen
                  ? "border-signal bg-signal-soft text-foreground"
                  : "border-dashed border-border-strong text-muted-foreground",
              )}
            >
              {chosen && <Check className="size-3.5" aria-hidden="true" />}
              {ROUTE_LABEL[route]}
              {chosen && <span className="sr-only"> (terpilih)</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {ROUTE_LABEL[analysis.route]}: {ROUTE_HINT[analysis.route]}.
      </p>
    </div>
  );
}
