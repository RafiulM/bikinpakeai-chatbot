import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Keeps ?c= in the address bar equal to the active conversation, so the URL
 * can always be copied or reopened in any view. Uses replace navigation to
 * avoid filling the back button with automatic steps.
 */
export function useConversationParam(activeId: string | undefined) {
  const { c } = useSearch({ from: "/_protected" });
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeId || c === activeId) return;
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, c: activeId }),
      replace: true,
      resetScroll: false,
    });
  }, [activeId, c, navigate]);

  return c;
}
