import { useCallback, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

// Recording mode (?rekam=1): a clean screen for video. It lives in the URL so
// it follows every view switch, renders on the server without a flash, and
// can be opened straight from a link.

export function useRecordingMode() {
  const on = useRouterState({
    select: (state) =>
      (state.location.search as { rekam?: number }).rekam === 1,
  });
  const navigate = useNavigate();
  const setRecording = useCallback(
    (next: boolean) =>
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, rekam: next ? (1 as const) : undefined }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  );

  // Esc leaves recording mode unless a dialog wants the key.
  useEffect(() => {
    if (!on) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      setRecording(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [on, setRecording]);

  return { recording: on, setRecording };
}
