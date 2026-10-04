import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecordingMode } from "../recording-mode";

const START_VIEWS = [
  { to: "/compare", label: "Chat" },
  { to: "/debug", label: "Debug" },
] as const;

/** Switch for the clean recording screen, plus where to start recording. */
export function RecordingModeCard() {
  const id = useId();
  const { recording, setRecording } = useRecordingMode();
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid content-start gap-4 rounded-[20px] border bg-card p-6 max-sm:p-4"
    >
      <div className="grid gap-1.5">
        <h2
          id={`${id}-title`}
          className="flex items-center gap-2.5 text-[17px] font-semibold"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-signal-soft text-signal-text"
          >
            <Video className="size-4" />
          </span>
          Mode rekaman
        </h2>
        <p className="text-sm text-muted-foreground">
          Layar bersih untuk merekam video: menu disembunyikan dan teks
          diperbesar. Tekan Esc untuk keluar.
        </p>
      </div>
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
    </section>
  );
}
