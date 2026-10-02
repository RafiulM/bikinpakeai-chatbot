import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { VIEW_LINKS } from "./view-nav";

const TYPING_TARGET =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Keys 1–4 switch between the four views of the same conversation. */
export function useViewShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
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
  }, [navigate]);
}
