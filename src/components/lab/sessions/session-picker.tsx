import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LabConversation } from "@/lib/lab/types";
import { DRAFT_ID } from "../conversation-store";
import { SessionStatus } from "./session-card";
import { useSessionList } from "./use-session-list";

const RECENT = 8;

/**
 * Shows which saved conversation Debug is reviewing and switches to another
 * one. The recent list is fetched each time the menu opens.
 */
export function SessionPicker({
  conversation,
}: {
  conversation: Pick<LabConversation, "id" | "code" | "title" | "status">;
}) {
  const [open, setOpen] = useState(false);
  const { items, loading, error } = useSessionList({
    q: "",
    status: "all",
    pageSize: RECENT,
    enabled: open,
  });
  const saved = conversation.id !== DRAFT_ID;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="max-w-full"
          title={saved ? conversation.title : undefined}
        >
          <History aria-hidden="true" />
          <span className="truncate">
            {saved ? `Sesi ${conversation.code}` : "Pilih sesi"}
          </span>
          {saved && <SessionStatus status={conversation.status} />}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1.5rem)]"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Sesi tersimpan terbaru
        </DropdownMenuLabel>
        {items.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {loading
              ? "Memuat…"
              : error
                ? "Riwayat gagal dimuat."
                : "Belum ada sesi tersimpan."}
          </p>
        )}
        {items.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <Link
              to="/debug"
              search={(prev) => ({ ...prev, c: item.id })}
              className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2"
            >
              {item.id === conversation.id ? (
                <Check className="mt-0.5" aria-label="Sedang direview" />
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="grid min-w-0">
                <span className="text-sm font-semibold">
                  {item.code}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {item.messageCount} pesan
                    {item.status === "active" && " · aktif"}
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.title}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/riwayat" className="font-semibold">
            <History aria-hidden="true" />
            Semua riwayat sesi
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
