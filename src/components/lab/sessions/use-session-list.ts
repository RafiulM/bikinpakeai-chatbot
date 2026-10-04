import { useCallback, useEffect, useRef, useState } from "react";
import { labApi } from "@/lib/lab/api-client";
import type { ConversationListItem } from "@/lib/lab/types";

export type SessionStatusFilter = "all" | "active" | "ended";

/**
 * Saved conversations from the API, searched and paged on the server. A
 * newer request always wins, so typing fast never shows an older result.
 */
export function useSessionList({
  q,
  status,
  pageSize = 20,
  enabled = true,
}: {
  q: string;
  status: SessionStatusFilter;
  pageSize?: number;
  /** Set false to wait, e.g. until a menu opens. */
  enabled?: boolean;
}) {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (offset: number) => {
      const request = ++latest.current;
      setLoading(true);
      try {
        const { data, meta } = await labApi.listConversations({
          limit: pageSize,
          offset,
          q,
          status,
        });
        if (request !== latest.current) return;
        setItems((current) => (offset === 0 ? data : [...current, ...data]));
        setHasMore(meta.hasMore);
        setError(null);
      } catch {
        if (request !== latest.current) return;
        setError("Riwayat sesi gagal dimuat. Coba lagi sebentar.");
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [q, status, pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => void load(0), 0);
    return () => clearTimeout(timer);
  }, [enabled, load]);

  return {
    items,
    hasMore,
    loading,
    error,
    reload: () => load(0),
    loadMore: () => load(items.length),
  };
}
