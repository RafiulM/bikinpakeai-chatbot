import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRecordingMode } from "../recording-mode";

const START_VIEWS = [
  { to: "/compare", label: "Compare" },
  { to: "/customer", label: "Customer" },
  { to: "/test-set", label: "Uji Test Set" },
] as const;

/** Switch for the clean recording screen, plus where to start recording. */
export function RecordingToggle() {
  const { recording, setRecording } = useRecordingMode();
  return (
    <div className="grid gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={recording}
        onClick={() => setRecording(!recording)}
        className="flex w-fit items-center gap-3 rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
            recording ? "border-foreground bg-foreground" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-[18px] rounded-full bg-card shadow-sm transition-transform motion-reduce:transition-none",
              recording && "translate-x-5",
            )}
          />
        </span>
        Mode rekaman {recording ? "aktif" : "mati"}
      </button>
      <p className="text-sm text-muted-foreground">
        Mulai rekam dari:{" "}
        {START_VIEWS.map((view, index) => (
          <span key={view.to}>
            {index > 0 && " · "}
            <Link
              to={view.to}
              search={(prev) => ({ ...prev, rekam: 1 as const })}
              className="font-semibold text-foreground underline underline-offset-3"
            >
              {view.label}
            </Link>
          </span>
        ))}
      </p>
      <p role="status" className="sr-only">
        {recording ? "Mode rekaman aktif. Tekan Esc untuk keluar." : ""}
      </p>
    </div>
  );
}
