import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { VIEW_LINKS } from "./view-nav";

const TYPING_TARGET =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * Keys 1–2 switch between the views of the same conversation. Off while the
 * lab views are hidden (demo mode off).
 */
export function useViewShortcuts(enabled = true) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target;
      if (target instanceof Element && target.closest(TYPING_TARGET)) return;
      // Never steal keys from an open dialog.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      const view = VIEW_LINKS.find((link) => link.shortcut === event.key);
      if (!view) return;
      event.preventDefault();
      void navigate({ to: view.to });
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, navigate]);
}
